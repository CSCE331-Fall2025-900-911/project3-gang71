CREATE TABLE customer (
    customerID INT PRIMARY KEY,
    firstName VARCHAR(25),
    lastName VARCHAR(25),
    phoneNumber VARCHAR(15) UNIQUE,
    email VARCHAR(50) UNIQUE,
    loyaltyPoints INT DEFAULT 0,
);

\copy customer FROM 'customers.csv' DELIMITER ',' CSV HEADER

ALTER TABLE "order"
ADD COLUMN customerID INT REFERENCES customer(customerID);

ALTER TABLE employee ADD COLUMN email VARCHAR(50) UNIQUE;