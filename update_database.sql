CREATE TABLE customer (
    customerID INT PRIMARY KEY,
    firstName VARCHAR(25),
    lastName VARCHAR(25),
    phoneNumber VARCHAR(15) UNIQUE,
    loyaltyPoints INT DEFAULT 0,
);

\copy customer FROM 'customers.csv' DELIMITER ',' CSV HEADER

-- TODO should we alter our order table to save customerID for each customer?
ALTER TABLE "order"
ADD COLUMN customerID INT REFERENCES customer(customerID);