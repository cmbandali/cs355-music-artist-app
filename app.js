const http = require('http');
const fs = require('fs');

const server_address = 'localhost';
const port = 3000;

// let html_stream = fs.createReadStream('./assets/index.html', 'utf8');
let search_stream = fs.createReadStream('./html/search-form.html');

let server = http.createServer((req,res)=>{
  if(req.url === '/'){
    console.log(`A new request was made from ${req.connection.remoteAddress} for ${req.url}`);
    res.writeHead(200,{'Content-Type':'text/html'});
    search_stream.pipe(res);
  } else if(req.url.includes('/favicon.ico')){
    console.log(`A new favicon request was made from ${req.connection.remoteAddress} for ${req.url}`);
    res.writeHead(404);
    res.end();
  } else if(req.url.includes('/artists/')){
    console.log(`A new artist request was made from ${req.connection.remoteAddress} for ${req.url}`);
    res.writeHead(200,{'Content-Type':'image/jpeg'});
    html_stream.pipe(res);
  } else if( req.url.includes('/search')){
    console.log(`A new search request was made from ${req.connection.remoteAddress} for ${req.url}`);
    res.writeHead(200,{'Content-Type':'text/html'});
    search_stream.pipe(res);
  }
});

console.log('Now listening on port ' + port);
server.listen(port, server_address);

// image_stream.on('error', function(err) {
//   console.log(err);
//   res.writeHead(404);
//   return res.end();
// });