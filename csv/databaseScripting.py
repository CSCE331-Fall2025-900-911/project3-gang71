import csv
import random
import sqlite3

# faker lib -- library that "cretaes realistic fake data"
from faker import Faker
from datetime import datetime, timedelta
fake = Faker()

# --------------------- connect to sqlite database for menu ---------------------
# generate sqlite database and add menu table + content
database = sqlite3.connect('project3.db')
cursor = database.cursor()

menuTable = '''CREATE TABLE menu(
				menuID INTEGER PRIMARY KEY,
                itemName VARCHAR(50),
                itemPrice DOUBLE,
                category VARCHAR(30),
                photo VARCHAR(150),
                description VARCHAR(200));'''

cursor.execute(menuTable)
menu = open('menu.csv')
menuItems = csv.reader(menu)
insertMenuItems = "INSERT INTO menu (menuID, itemName, itemPrice, category, photo, description) VALUES (?, ?, ?, ?, ?, ?)"
cursor.executemany(insertMenuItems, menuItems)

# make dictionary to store menu prices based on their id
cursor.execute("SELECT menuID, itemPrice FROM menu")
extractedItems = cursor.fetchall()
menuPrices = {}
for item in extractedItems:
  menuPrices.update({item[0]:item[1]}) # need to check syntax


# -------------------------- generate csv for drink table -------------------------
drinkID = 1
drinksData = []
def generateDrink(orderID):
  global drinkID 
  
  # randomly choose drink, cup size, sugar level, and ice amount
  itemID = random.randint(1, 150)
  cupSize = random.randint(151, 153)
  sugarLevel = random.randint(177,182)
  iceAmount = random.randint(183,186)
  
  # add cost of chosen drink size
  totalDrinkPrice = 0
  totalDrinkPrice += menuPrices[cupSize]
    
  # randomly decide if there is topping 1 and add topping 1 price
  hasTopping1 = random.randint(1,2)
  if hasTopping1 == 1:
    topping1 = random.randint(154,176)
    totalDrinkPrice += menuPrices[topping1]
  else:
    topping1 = ''

  # randomly decide if there is topping 2 and add topping 2 price
  hasTopping2 = random.randint(1,2)
  if hasTopping1 == 1 and hasTopping2 == 1:
    topping2 = random.randint(154,176)
    totalDrinkPrice += menuPrices[topping2]
  else:
    topping2 = ''
  	
  # calculate total price of drink with toppings
  totalDrinkPrice += menuPrices[itemID]
  totalDrinkPrice = round(totalDrinkPrice, 2)

  # randomly choose drink quantity
  quantity = random.randint(1,2)
    
  # add drink row
  drinksData.append([drinkID, orderID, itemID, cupSize, sugarLevel, iceAmount, topping1, topping2, totalDrinkPrice, quantity])
    
  drinkID += 1
    
  return totalDrinkPrice * quantity


# ------------------------ generate csv for order table ---------------------------

# generate date and time
def generateDateTime():
  # move orders up by weeks, within each week by days, and within store hours by time
  weekDay = random.randint(0, 6)
  weekNumber = random.randint(0, 65)
  startDate = datetime(2025, 1, 1) + timedelta(weeks = weekNumber) + timedelta(days = weekDay) + timedelta(hours = 11)
  if(weekDay > 4):
    return fake.date_time_between(start_date = startDate, end_date = startDate + timedelta(hours = 11) + timedelta(minutes = 30))
  return fake.date_time_between(start_date = startDate, end_date = startDate + timedelta(hours = 11))
    
# generating orders
# group of six - 65 weeks= 455 days, total of 1.25 million orders ==> ~20,000 orders a week
# store data in csv file 
with open('orders.csv', 'w', newline = '') as csvfile:
  writer = csv.writer(csvfile)
  # add header row
  writer.writerow(["orderID", "orderPrice", "salesTax", "orderDate", "orderTime", "tips", "employeeID", "customerID"])
  
  orderID = 1
  revenue = 0
  while revenue < 1250000:
    # generate the drink
    # need random number of drinks + a place to store the drink prices (Which is returned by the genDrink function)
    # have three peak days: feb 14, aug 30 (first game), oct 31 --- increase the number of drinks in the order by a random amount
    numDrinks = random.randint(1,3)
    orderDateTime = generateDateTime()
    if (orderDateTime.month == 2 and orderDateTime.day == 14) or (orderDateTime.month == 8 and orderDateTime.day == 30) or (orderDateTime.month == 10 and orderDateTime.day == 31):
      numDrinks += random.randint(1,3)
    drinksPrice = 0
          
    # add the total price every time a drink is made
    for drinks in range(numDrinks):
      drinksPrice += generateDrink(orderID)
          
    # create the order: total price, sales tax, order time, tips, employee id
    orderDate = orderDateTime.date().strftime("%Y-%m-%d")
    orderTime = orderDateTime.strftime("%H:%M:%S")
    salesTax = round(0.0625 * drinksPrice, 2)
    tips = random.randint(1,5)
    totalPrice = round(drinksPrice + salesTax + tips, 2)
    employeeID = random.randint(1,10)
    customerID = random.randint(1,250)
          
    # add row to orders csv
    writer.writerow([orderID, totalPrice, salesTax, orderDate, orderTime, tips, employeeID, customerID])
    # update order id
    orderID += 1
    # update revenue
    revenue += totalPrice
        
# write drinks data into csv
with open('drinks.csv', 'w', newline = '') as csvfile:
  drinkWriter = csv.writer(csvfile)
  drinkWriter.writerow(["drinkID", "orderID", "itemID", "cupSize", "sugarLevel", "iceAmount", "topping1", "topping2", "totalDrinkPrice", "quantity"])
  drinkWriter.writerows(drinksData)


# ----------------------------- generate csv for customer table -----------------------
firstNames = ['James', 'Michael', 'John', 'Robert', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher',
              'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Steven', 'Donald', 'Andrew', 'Joshua', 'Paul',
              'Aniket', 'Kevin', 'Brian', 'Timothy', 'Krish', 'Jason', 'George', 'Edward', 'Jeffrey', 'Ryan',
              'Jacob', 'Nicholas', 'Gary', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Benjamin', 'Scott',
              'Brandon', 'Samuel', 'Gregory', 'Alexander', 'Patrick', 'Frank', 'Jack', 'Raymond', 'Aditya', 'Tyler',
              'Mary', 'Isha', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Karen', 'Sarah',
              'Lisa', 'Nancy', 'Sandra', 'Ashley', 'Emily', 'Kimberly', 'Betty', 'Margaret', 'Donna', 'Michelle',
              'Carol', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Riya', 'Amy',
              'Kathleen', 'Angela', 'Dorothy', 'Diya', 'Emma', 'Brenda', 'Nicole', 'Pamela', 'Samantha', 'Katherine',
              'Christine', 'Debra', 'Rachel', 'Olivia', 'Carolyn', 'Maria', 'Janet', 'Heather', 'Diane', 'Julie']

lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
             'Hernandez', 'Lopez', 'Gonzales', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
             'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
             'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
             'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
             'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
             'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',
             'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
             'Watson', 'Brooks', 'Chavez', 'Wood', 'Bennet', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price',
             'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez', 'Gupta']

def generateNumSequence(n):
  str = ''
  for i in range(0,n):
    str = str + str(random.randint(0,9))
  return str

customercsv = open('customers.csv', 'w', newline = '')
customerWriter = csv.writer(customercsv)
customerWriter.writerow(['customerID', 'firstName', 'lastName', 'phoneNumber', 'loyaltyPoints'])

for c in range(1, 251):
  # generate random values
  fName = firstNames[random.randint(0, 99)]
  lName = lastNames[random.randint(0, 99)]
  phoneNum = str(random.randint(2,9)) + generateNumSequence(2) + '-' + str(random.randint(2,9)) + generateNumSequence(2) + '-' + generateNumSequence(4)
  loyalPoints = random.randint(0,500)

  # add new customer data to csv file
  customerWriter.writerow([c, fName, lName, phoneNum, loyalPoints])
  