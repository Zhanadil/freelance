require('module-alias/register');

const app = require('@root/app');

app.server.listen(app.port);

console.log(`Server started on: http://${app.host}:${app.port}`);
