const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');
const querystring = require('querystring');

/*Stream to get credentials*/
const credentials_json = fs.readFileSync('./auth/credentials.json', 'utf-8');
const credentials = JSON.parse(credentials_json);

const server_address = 'localhost';
const port = 3000;

let search_stream = fs.createReadStream('./html/search-form.html');

let server = http.createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/html'});
  search_stream.pipe(res);

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
    const querystring = require('querystring');
    let user_input = req.url;
    let name = querystring.parse(user_input, "/search?");

    let post_data = {
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      grant_type: "client_credentials",
    }
    post_data = querystring.stringify(post_data);

    let options = {
      method:'POST',
      headers:{
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': post_data.length
      }
    }

    /*Create the request using http.request and supplying it relevant data*/
    const authentication_req_url = 'https://accounts.spotify.com/api/token';
    let request_sent_time = new Date();
    let authentication_req = https.request(authentication_req_url, options, authentication_res => {
      recieved_authentication(authentication_res,res,user_input,request_sent_time);
    });
    authentication_req.on('error', (e) => {
      console.log(e);
    });
    authentication_req.write(post_data);
    console.log("Requesting Token");
    authentication_req.end();

    /*function to catch the result of the authentication request*/
    function recieved_authentication(authentication_res,res,user_input,request_sent_time){
      authentication_res.setEncoding("utf8");
      let body = "";
      authentication_res.on("data", data => {body += data;});
      authentication_res.on("end", () => {
        let authentication_res_data = JSON.parse(body);
        authentication_res_data.expiration =  new Date().setHours(request_sent_time.getHours() + 1);
        console.log(authentication_res_data);
        create_cache(authentication_res_data);
        // create_search_req(authentication_res_data,res,user_input,request_sent_time);
      });
    }

    /*writes to a file*/
    function create_cache(authentication_res_data){
      data = JSON.stringify(authentication_res_data);
      fs.writeFile('./auth/authentication_res.json', data, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
      });
    }

    /*Checking to see if a cached file exists*/
    let cache_valid = false;
    const authentication_cache = './auth/authentication_res.json';
    if(fs.existsSync(authentication_cache)) {
      content = fs.readFileSync(authentication_cache, 'utf-8');
      cached_auth = JSON.parse(content);
      if(new Date(cached_auth.expiration) > Date.now()){
        cache_valid = true;
      }
      else{
        console.log('Token Expired');
      }
    }
    if(cache_valid){
      // create_search_req(cached_auth,res,user_input);
    }
    else{
      const authentication_req_url = 'https://accounts.spotify.com/api/token';
      let request_sent_time = new Date();
      let authentication_req = https.request(authentication_req_url, options, authentication_res => {
        recieved_authentication(authentication_res,res,user_input,request_sent_time);
      });
      authentication_req.on('error', (e) => {
        console.errors(e);
      });
      authentication_req.write(post_data);
      console.log("Requesting Token");
      authentication_req.end();
    }

    /*Request to download the image at the url specfied*/
    
    /*Stream to get access_token*/
    const authentication_json = fs.readFileSync('./auth/authentication_res.json', 'utf-8');
    const authentication = JSON.parse(authentication_json);

    let url_data = {
      q: name.artist,
      type: 'artist',
      access_token: authentication.access_token
    }
    url_data = querystring.stringify(url_data);
    let url = 'https://api.spotify.com/v1/search?' + url_data;
    console.log(url);

    let img_path = `./artists/${name.artist}.jpg`

    let image_req = https.get(url, image_res => {
      console.log("response: " + image_res.statusCode);
      let new_img = fs.createWriteStream(img_path,{'encoding':null});
      image_res.pipe(new_img);

      // new_img.on("data", function(chunk) {
      //   console.log("BODY: " + chunk);
      // });

      new_img.on('finish', function() {
        // let img_data = JSON.stringify(image_res.headers);
        // let img_res_data = JSON.parse(body);
        // create_cache(img_data, './artists/{name.artist}.json');
        let webpage = `<h1>${name.artist}</h1><p>Music</p><img src="./artists/${name.artist}.jpg" />`;
        // webpage.pipe(res);
      });

    });
    image_req.on('error', (e) => {
      console.log(e);
    });

  }//search else if

});

console.log('Now listening on port ' + port);
server.listen(port, server_address);

// image_stream.on('error', function(err) {
//   console.log(err);
//   res.writeHead(404);
//   return res.end();
// });
