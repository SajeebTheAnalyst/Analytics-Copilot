const http = require('http');
http.createServer((req, res) => {
  console.log(req.method, req.url);
  console.log(req.headers);
  res.end('{}');
}).listen(8080, () => {
  console.log("Listening");
});
