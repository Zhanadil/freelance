require('module-alias/register');

const app = require('@root/app');

app.httpServer.listen(app.port);
app.httpsServer.listen(app.httpsPort);

console.log(`Server started on: http://${app.host}:${app.port}`);
console.log(`Secured server started on: https://${app.host}:${app.httpsPort}`);
