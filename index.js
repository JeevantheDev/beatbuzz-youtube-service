const app = require('./src/server');

const PORT = process.env.PORT || 7999;

app.listen(PORT, console.log(`Youtube service is running on PORT ${PORT}`));
