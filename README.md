# Circle App

This project is a simple web application that allows users to create and manipulate a circle on the UI. Users can change the circle's background color, adjust its radius, and reset it to its original state.

## Project Structure

```
circle-app
├── src
│   ├── server.js               # Entry point for the backend application
│   ├── controllers
│   │   └── circleController.js  # Logic for circle manipulation
│   ├── routes
│   │   └── api.js               # API endpoints for circle properties
│   └── public
│       ├── index.html           # HTML structure for the UI
│       ├── css
│       │   └── styles.css       # CSS styles for the application
│       └── js
│           └── app.js           # JavaScript for UI interactions
├── package.json                 # npm configuration file
├── .gitignore                   # Files to be ignored by Git
└── README.md                    # Project documentation
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd circle-app
   ```

2. Install the dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000` to view the application.

## Usage

- Use the buttons on the UI to:
  - Change the circle's background color.
  - Adjust the radius of the circle.
  - Reset the circle to its original state.

## Technologies Used

- Node.js
- Express
- HTML/CSS/JavaScript

## License

This project is licensed under the MIT License.