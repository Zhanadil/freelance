require('module-alias/register');

const app = require('@root/app');

const port = process.env.PORT || 3000;
app.listen(port);
