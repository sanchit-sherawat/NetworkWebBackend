const express = require('express');
const path = require('path');
const app = express();
const authRoutes = require('./src/routes/api/auth');
const adminapai = require('./src/routes/api/adminapi')
const cors = require('cors');

// Add this line to parse JSON bodies!
app.use(express.json());
// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route mapping (key: route, value: file name)
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
  confirmation:'registration-confirmation.html',
  
  
  // add more as needed
};

app.use(cors())
app.use('/api', authRoutes);
app.use('/adminapi',adminapai)

// Dynamic route using the map
app.get('/:page', (req, res) => {
  const page = req.params.page;
  const fileName = routeMap[page];

  if (fileName) {
    const filePath = path.join(__dirname, 'public', fileName);
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(500).send('Internal Server Error');
      }
    });
  } else {
    res.status(404).send('Page not found');
  }
});

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home'));
});


app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
