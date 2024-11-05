const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 3000; // You can choose any port you like

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Praveen1@3',
    database: 'property',
};

const connection = mysql.createConnection(dbConfig);

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the "static" directory
app.use(express.static(path.join(__dirname, 'static')));

// Serve the login and sign-up pages
app.get('/', function (request, response) {
    response.sendFile(path.join(__dirname + '/login.html'));
});


//handle sign-up
app.post('/signup', function (request, response) {
    let signupusername = request.body.signupusername;
    let signuppassword = request.body.signuppassword;

    if (signupusername && signuppassword) {
        // Check if the username already exists
        connection.query('SELECT * FROM login WHERE username = ?', [signupusername], function (error, results) {
            if (error) {
                response.send('Error checking the username.');
                response.end();
            } else if (results.length > 0) {
                // Username already exists, display a pop-up message
                let errorMessage = 'Username already taken. Please choose a different username.';
                return response.send(`
                    <script>
                        alert("${errorMessage}");
                        window.location.href = "/"; // Redirect back to the signup page
                    </script>
                `);
            } else {
                // Username is available, so insert it into the database
                connection.query('INSERT INTO login (username, password) VALUES (?, ?)', [signupusername, signuppassword], function (error, results) {
                    if (error) {
                        // Check if the error is due to the password length trigger
                        if (error.code === 'ER_SIGNAL_EXCEPTION' && error.sqlMessage.includes('Password must be at least 8 characters long')) {
                            let passwordErrorMessage = 'Password must be at least 8 characters long.';
                            return response.send(`
                                <script>
                                    alert("${passwordErrorMessage}");
                                    window.location.href = "/"; // Redirect back to the signup page
                                </script>
                            `);
                        } else {
                            response.send('Error creating the account.');
                            response.end();
                        }
                    } else {
                        // Redirect to the page1.html after successful signup
                        response.redirect('/page1.html');
                    }
                });
            }
        });
    } else {
        response.send('Please enter both a username and a password for sign-up.');
        response.end();
    }
});



// Handle login
app.post('/login', function (request, response) {
    let loginusername = request.body.loginusername;
    let loginpassword = request.body.loginpassword;

    if (loginusername && loginpassword) {
        connection.query('SELECT * FROM login WHERE username = ? AND password = ?', [loginusername, loginpassword], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {
                request.session.loggedin = true;
                request.session.username = loginusername;
                response.redirect('/homepage.html'); // Redirect to homepage.html
            } else {
                // Display a pop-up message when login fails
                let errorMessage = 'Incorrect Username and/or Password!';
                return response.send(`
                    <script>
                        alert("${errorMessage}");
                        window.location.href = "/"; // Redirect back to the login page
                    </script>
                `);
            }
        });
    } else {
        response.send('Please enter both a username and a password for login.');
        response.end();
    }
});



// Routes for each role
app.post('/register-seller', (req, res) => {
    handleRegistration(req, res, 'seller');
});

app.post('/register-owner', (req, res) => {
    handleRegistration(req, res, 'owner');
});


function handleRegistration(req, res, role) {
    const formData = req.body;

    // Insert the form data into the appropriate table based on the role
    const query = `INSERT INTO ${role}s (first_name, last_name, gender, age, phone_number, email) VALUES (?, ?, ?, ?, ?, ?)`;

    connection.query(query, [
        formData['first-name'],
        formData['last-name'],
        formData.gender,
        formData.age,
        formData['phone-number'],
        formData.email,
    ], (error, results) => {
        if (error) {
            if (error.code === 'ER_SIGNAL_EXCEPTION' && error.sqlMessage.includes('Phone number already exists for a different seller')) {
                // Handle the phone number conflict here
                return res.send('Phone number already exists for a different seller. Please use a different phone number.');
            } else {
                console.error(`Error inserting data for ${role}: ${error}`);
                return res.status(500).send('Error occurred while processing your request.');
            }
        }

        // Redirect to property.html if the role is "seller"
        if (role === 'seller') {
            res.redirect('/property.html');
        }
        if (role === 'owner') {
            res.redirect('/house.html');
        }
    });
}

// Update the existing route in login.js to handle the registration of buyers
app.post('/register-buyer', (req, res) => {
    const formData = req.body;

    // Insert the form data into the "buyers" table
    const query = `INSERT INTO buyers (first_name, last_name, gender, age, phone_number, email, interested_in) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    connection.query(query, [
        formData['first-name'],
        formData['last-name'],
        formData.gender,
        formData.age,
        formData['phone-number'],
        formData.email,
        formData.interested,
    ], (error, results) => {
        if (error) {
            console.error(`Error inserting data for buyer: ${error}`);
            return res.status(500).send('Error occurred while processing your request.');
        }

        // Redirect or respond as necessary after successful registration
        res.redirect('/login.html'); // Redirect to a success page
    });
});

// Handle the registration of tenants
app.post('/register-tenant', (req, res) => {
    const formData = req.body;

    // Insert the form data into the "tenants" table
    const query = `INSERT INTO tenants (first_name, last_name, gender, age, phone_number, email, interested_in) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    connection.query(query, [
        formData['first-name'],
        formData['last-name'],
        formData.gender,
        formData.age,
        formData['phone-number'],
        formData.email,
        formData.interested,
    ], (error, results) => {
        if (error) {
            console.error(`Error inserting data for tenant: ${error}`);
            return res.status(500).send('Error occurred while processing your request.');
        }

        // Redirect or respond as necessary after successful registration
        res.redirect('/login.html'); // Redirect to a success page or login
    });
});



// Property Details
app.post('/submit-property', (req, res) => {
    const formData = req.body;

    // Insert the form data into the MySQL database for properties
    connection.query('INSERT INTO properties (property_type, area, price_per_sqft, location, phone_number) VALUES (?, ?, ?, ?, ?)', [
        formData['property-type'],
        formData.area,
        formData['price-per-sqft'],
        formData.location,
        formData['phone-number'],
    ], (err, result) => {
        if (err) {
            // Check if the error is due to the trigger
            if (err.code === 'ER_SIGNAL_EXCEPTION' && err.sqlMessage.includes('Area and price_per_sqft must be greater than 0')) {
                let propertyErrorMessage = 'Area and price_per_sqft must be greater than 0.';
                return res.send(`
                    <script>
                        alert("${propertyErrorMessage}");
                        window.location.href = "/submit-property"; // Redirect back to the property submission page
                    </script>
                `);
            } else {
                console.error('Error inserting property data into MySQL: ' + err);
                res.status(500).send('Error occurred while processing your request.');
            }
        } else {
            // Redirect to the login.html after successful submission
            res.redirect('/login.html');
        }
    });
});



// House Details
app.post('/submit-house', (req, res) => {
    const formData = req.body;

    // Insert the form data into the MySQL database for houses
    connection.query('INSERT INTO houses (house_type, rent, maintenance_fee, location, phone_number) VALUES (?, ?, ?, ?, ?)', [
        formData['house-type'],
        formData.rent,
        formData['maintenance-fee'],
        formData.location,
        formData['phone-number'],
    ], (err, result) => {
        if (err) {
            console.error('Error inserting house data into MySQL: ' + err);
            res.status(500).send('Error occurred while processing your request.');
        } else {
            // Redirect to the login.html after successful submission
            res.redirect('/login.html');
        }
    });
});





app.get('/check-availability-button', (req, res) => {
    const sortOption = req.query.sort;
    const propertyType = req.query['property-type'];

    let sqlQuery = `
    SELECT DISTINCT
        s.first_name,
        s.last_name,
        s.gender,
        s.age,
        s.phone_number,
        s.email,
        p.property_type,
        p.area,
        p.price_per_sqft,
        CalculateTotalPrice(p.area,p.price_per_sqft) AS total_price,
        p.location
    FROM
        sellers AS s
    INNER JOIN
        properties AS p
    ON
        s.phone_number = p.phone_number
    `;

    // Add conditions for property type
    if (propertyType && propertyType !== 'all') {
        sqlQuery += ` WHERE p.property_type = '${propertyType}'`;
    }

    // Add conditions for sorting
    if (sortOption === 'low-to-high') {
        sqlQuery += ' ORDER BY total_price ASC';
    } else if (sortOption === 'high-to-low') {
        sqlQuery += ' ORDER BY total_price DESC';
    }

    connection.query(sqlQuery, (error, results) => {
        if (error) {
            res.status(500).send('Error retrieving data.');
        } else {
            if (results.length > 0) {
                let html = '<h1>Sellers\' Properties</h1>';
                html += '<table class="property-table">';
                html += '<table>';
                html += '<tr><th>Name</th><th>Gender</th><th>Age</th><th>Phone</th><th>Email</th><th>Property Type</th><th>Area</th><th>Price per Sqft</th><th>Total Price</th><th>Location</th></tr>';

                results.forEach((result) => {
                    html += `<tr><td>${result.first_name} ${result.last_name}</td><td>${result.gender}</td><td>${result.age}</td><td>${result.phone_number}</td><td>${result.email}</td><td>${result.property_type}</td><td>${result.area}</td><td>${result.price_per_sqft}</td><td>${result.total_price}</td><td>${result.location}</td></tr>`;
                });

                html += '</table>';
                res.send(html);
            } else {
                res.send('<p>No sellers\' properties found.</p>');
            }
        }
    });
});


// Assuming you're using Express

app.get('/check-buyers', (req, res) => {
    const buyerType = req.query['buyer-type'];

    // Assuming you have a MySQL connection named "connection"
    if (buyerType === 'all') {
        let sqlQuery = 'SELECT * FROM buyers';
        connection.query('SELECT * FROM buyers', (error, results) => {
            if (error) {
                res.status(500).send('Error retrieving buyer records.');
            } else {
                if (results.length > 0) {
                    let html = '<h1>Buyers\' List</h1>';
                    html += '<table class="buyer-table">';
                    html += '<table>';
                    html += '<tr><th>Name</th><th>Gender</th><th>Age</th><th>Phone</th><th>Email</th><th>Interested IN</th></tr>';
    
                    results.forEach((result) => {
                        html += `<tr><td>${result.first_name} ${result.last_name}</td><td>${result.gender}</td><td>${result.age}</td><td>${result.phone_number}</td><td>${result.email}</td><td>${result.interested_in}</td></tr>`;
                    });
    
                    html += '</table>';
                    res.send(html);
            }
    }});
    } else if (buyerType === 'potential') {
        let potentialBuyersQuery = `select * from potentialBuyers`;
        connection.query(potentialBuyersQuery, (error, results) => {
            if (error) {
                res.status(500).send('Error retrieving potential buyer records.');
            } else {
                if (results.length > 0) {
                    let html = '<h1>Potential Buyers</h1>';
                    html += '<table class="potential-buyers-table">';
                    html += '<tr><th>Seller Name</th><th>Seller Phone</th><th>Property Type</th><th>Area</th><th>Price per Sqft</th><th>Total Price</th><th>Buyer Name</th><th>Buyer Phone</th></tr>';
    
                    results.forEach((result) => {
                        html += `<tr><td>${result.seller_first_name} ${result.seller_last_name}</td><td>${result.seller_phone_number}</td><td>${result.property_type}</td><td>${result.area}</td><td>${result.price_per_sqft}</td><td>${result.total_price}</td><td>${result.buyer_first_name} ${result.buyer_last_name}</td><td>${result.buyer_phone_number}</td></tr>`;
                    });
    
                    html += '</table>';
                    res.send(html);
                } else {
                    res.send('<p>No potential buyers found.</p>');
                }
            }
        });
    }
     else {
        res.status(400).send('Invalid request.');
    }
});


app.get('/check-tenants', (req, res) => {
    const tenantType = req.query['tenant-type'];

    if (tenantType === 'all') {
        let sqlQuery = 'SELECT * FROM tenants';
        connection.query(sqlQuery, (error, results) => {
            if (error) {
                res.status(500).send('Error retrieving tenant records.');
            } else {
                if (results.length > 0) {
                    let html = '<h1>Tenants\' List</h1>';
                    html += '<table class="tenant-table">';
                    html += '<tr><th>Name</th><th>Gender</th><th>Age</th><th>Phone</th><th>Email</th><th>Interested IN</th></tr>';
    
                    results.forEach((result) => {
                        html += `<tr><td>${result.first_name} ${result.last_name}</td><td>${result.gender}</td><td>${result.age}</td><td>${result.phone_number}</td><td>${result.email}</td><td>${result.interested_in}</td></tr>`;
                    });
    
                    html += '</table>';
                    res.send(html);
                }
            }
        });
    } else if (tenantType === 'potential') {
        let potentialTenantsQuery = `
            SELECT
                o.first_name AS owner_first_name,
                o.last_name AS owner_last_name,
                o.phone_number AS owner_phone_number,
                h.house_type AS house_type,
                h.rent AS rent,
                h.maintenance_fee AS maintenance_fee,
                CalculateTotalRent(h.rent, h.maintenance_fee) AS total_rent,
                t.first_name AS tenant_first_name,
                t.last_name AS tenant_last_name,
                t.interested_in AS interested_in,
                t.phone_number AS tenant_phone_number
            FROM
                owners AS o
            RIGHT JOIN
                houses AS h ON o.phone_number = h.phone_number
            LEFT JOIN
                tenants AS t ON t.interested_in = h.house_type
            WHERE
                t.interested_in IS NOT NULL;
        `;
    
        connection.query(potentialTenantsQuery, (error, results) => {
            if (error) {
                res.status(500).send('Error retrieving potential tenant records.');
            } else {
                if (results.length > 0) {
                    let html = '<h1>Potential Tenants</h1>';
                    html += '<table class="potential-tenants-table">';
                    html += '<tr><th>Owner Name</th><th>Owner Phone</th><th>House Type</th><th>Rent</th><th>Maintenance Fee</th><th>Total Rent</th><th>Tenant Name</th><th>Tenant Phone</th></tr>';
    
                    results.forEach((result) => {
                        html += `<tr><td>${result.owner_first_name} ${result.owner_last_name}</td><td>${result.owner_phone_number}</td><td>${result.house_type}</td><td>${result.rent}</td><td>${result.maintenance_fee}</td><td>${result.total_rent}</td><td>${result.tenant_first_name} ${result.tenant_last_name}</td><td>${result.tenant_phone_number}</td></tr>`;
                    });
    
                    html += '</table>';
                    res.send(html);
                } else {
                    res.send('<p>No potential tenants found.</p>');
                }
            }
        });
    }
     else {
        res.status(400).send('Invalid request.');
    }
});



app.get('/check-availability-house', (req, res) => {
    const sortOption = req.query.sort;
    const houseType = req.query['house-type'];
    const groupBy = req.query['group-by']; // Extract the 'group-by' parameter

    let sqlQuery = `
    SELECT
        o.first_name,
        o.last_name,
        o.gender,
        o.age,
        o.phone_number,
        o.email,
        h.house_type,
        h.rent,
        h.maintenance_fee,
        CalculateTotalRent(h.rent, h.maintenance_fee) AS total_rent,
        h.location
    FROM
        owners AS o
    RIGHT JOIN
        houses AS h
    ON
        o.phone_number = h.phone_number
    `;

    // Add conditions for house type
    if (houseType && houseType !== 'all') {
        sqlQuery += ` WHERE h.house_type = '${houseType}'`;
    }

    // Add conditions for sorting
    if (sortOption === 'low-to-high') {
        sqlQuery += ' ORDER BY total_rent ASC';
    } else if (sortOption === 'high-to-low') {
        sqlQuery += ' ORDER BY total_rent DESC';
    }

    connection.query(sqlQuery, (error, results) => {
        if (error) {
            res.status(500).send('Error retrieving data.');
        } else {
            if (results.length > 0) {
                let html = '<h1>Houses Availability</h1>';
                html += '<table class="house-table">';
                html += '<tr><th>Name</th><th>Gender</th><th>Age</th><th>Phone</th><th>Email</th><th>House Type</th><th>Rent</th><th>Maintenance Fee</th><th>Total Rent</th><th>Location</th></tr>';

                results.forEach((result) => {
                    html += `<tr><td>${result.first_name} ${result.last_name}</td><td>${result.gender}</td><td>${result.age}</td><td>${result.phone_number}</td><td>${result.email}</td><td>${result.house_type}</td><td>${result.rent}</td><td>${result.maintenance_fee}</td><td>${result.total_rent}</td><td>${result.location}</td></tr>`;
                });

                html += '</table>';
                res.send(html);
            } else {
                res.send('<p>No houses available.</p>');
            }
        }
    });
});





app.get('/home', function (request, response) {
    if (request.session.loggedin) {
        response.send('Welcome back, ' + request.session.username + '!');
    } else {
        response.send('Please login to view this page!');
    }
    response.end();
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
