// const express = require('express');
// const path = require('path');
// const app = express();
// const authRoutes = require('./src/routes/api/auth');
// const adminapai = require('./src/routes/api/adminapi')
// const cors = require('cors');

// // Add this line to parse JSON bodies!
// app.use(express.json());
// // Serve static files
// app.use(express.static(path.join(__dirname, 'public')));

// // Route mapping (key: route, value: file name)
// const routeMap = {
//   about: 'about-us.html',
//   services: 'our-services.html',
//   contact: 'contact-us.html',
//   home: 'index.html',
//   team: 'meet-our-team.html',
//   mission: 'our-mission.html',
//   works: 'how-it-works.html',
//   testimonials: 'testimonials.html',
//   register: 'register.html',
//   login: 'login.html',
//   'set-password': 'set-password.html',
//   confirmation:'registration-confirmation.html',
  
  
//   // add more as needed
// };

// app.use(cors())
// app.use('/api', authRoutes);
// app.use('/adminapi',adminapai)

// // Dynamic route using the map
// app.get('/:page', (req, res) => {
//   const page = req.params.page;
//   const fileName = routeMap[page];

//   if (fileName) {
//     const filePath = path.join(__dirname, 'public', fileName);
//     res.sendFile(filePath, (err) => {
//       if (err) {
//         res.status(500).send('Internal Server Error');
//       }
//     });
//   } else {
//     res.status(404).send('Page not found');
//   }
// });

// // Default route
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'home'));
// });


// app.listen(3000, () => {
//   console.log('Server running at http://localhost:3000');
// });

const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');

const authRoutes = require('./src/routes/api/auth');
const adminapai = require('./src/routes/api/adminapi');

// Middleware
app.use(cors());
app.use(express.json());

// === Serve static HTML files from "public" ===
app.use(express.static(path.join(__dirname, 'public')));

// Route mapping for static pages
const routeMap = {
  about: 'about-us.html',
  services: 'our-services.html',
  contact: 'contact-us.html',
  home: 'index.html',
  team: 'meet-our-team.html',
  mission: 'our-mission.html',
  works: 'how-it-works.html',
  testimonials: 'testimonials.html',
  register: 'register.html',
  login: 'login.html',
  'set-password': 'set-password.html',
  confirmation: 'registration-confirmation.html',
  // Add more as needed
};

// API Routes
app.use('/api', authRoutes);
app.use('/adminapi', adminapai);

// Static page routing
app.get('/:page', (req, res, next) => {
  const page = req.params.page;
  const fileName = routeMap[page];

  if (fileName) {
    const filePath = path.join(__dirname, 'public', fileName);
    return res.sendFile(filePath, err => {
      if (err) {
        res.status(500).send('Internal Server Error');
      }
    });
  }

  next(); // move to next handler (in case /member is matched)
});

// Default root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// === React App for /member ===
const buildPath = path.join(__dirname, 'build');

app.use('/member', express.static(buildPath));

// Handle SPA routing in React (like /member/dashboard)
app.get(/^\/member(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// === Catch-all for dynamic usernames ===
app.get('/:username', (req, res) => {
  const knownPages = Object.keys(routeMap);
  const username = req.params.username;

  if (!knownPages.includes(username)) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }

  res.status(404).send('Page not found');
});


// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

