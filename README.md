Web Application Proxy
=====================

Basic web application proxy. The proxy provides authentication for backend UI and API
web services.


## Dependencies

This application requires MongoDB for user account and session storage. Install application
dependencies:

    npm install


## Running the Proxy

Set environment variables to define where the application user interface and API can be
accessed:

    export API=http://localhost:8080
    export UI=http://localhost:8081

The proxy expects the URL provided to be a host with no path.

Start the application server.

    npm run start


## Logging

The server sends log messages to standard output. You'll need to redirect stdout to a file
if you want to retain the proxy logs.


## User Accounts

Sample user accounts are defined in mock/users.json  You can load the mock
accounts by running the config/bash/reload bash script.

The password.js script has been provided to help you quickly generated hashed
password strings:

    password.js password
