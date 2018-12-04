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
    // html_stream.pipe(res);
    // image_stream.on('error', function(err) {
    //   console.log(err);
    //   res.writeHead(404);
    //   return res.end();
    // })
  } else if( req.url.includes('/search')){
    console.log(`A new search request was made from ${req.connection.remoteAddress} for ${req.url}`);
    search_stream.pipe(res);
    const querystring = require('querystring');
    /*user input converted to an object*/
    let user_input = req.url;
    user_input = querystring.parse(user_input, "/search?"); //{ artist: 'Drake' }
    user_input.artist = user_input.artist.toUpperCase(); //so that duplicate caches arn't made for the same artist

    /*Spotify identification - going to be using client credentials flow*/
    let post_data = {
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      grant_type: "client_credentials",
    }
    post_data = querystring.stringify(post_data); //data must be sent as a query string

    /*tells method being used and header information*/
    let options = {
      host: 'accounts.spotify.com',
      path: '/api/token',
      method:'POST',
      headers:{
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': post_data.length
      }
    }

    const authentication_req_url = 'https://accounts.spotify.com/api/token';
    // let request_sent_time = new Date();

    /*Create the request using https.request and supplying it relevant data*/
    // let authentication_req = https.request(options, (authentication_res) => {
    //   recieved_authentication(authentication_res,res,user_input,request_sent_time); /*Callback function to be triggered when we recieve a response*/
    // });

    // authentication_req.on('error', (e) => {
    //   console.log(e);
    // });

    // /*write function sends request and puts post_data into the body of the request since method is POST*/
    // authentication_req.write(post_data);
    // console.log("Requesting Token");
    // authentication_req.end();

    /*Check if cached access_token exists and if it is expired*/
    let cache_valid = false;
    let authentication_cache = './auth/authentication_res.json';
    if(fs.existsSync(authentication_cache)) {
      content = fs.readFileSync(authentication_cache, 'utf-8');
      cached_auth = JSON.parse(content); //authentication json convertes to js object
      if(cached_auth.expiration > Date.now()) cache_valid = true; //access_token is still valid
      else console.log('Access_Token is Expired, need to request new token');
    }

    if(cache_valid) create_search_req(cached_auth, res, user_input);
    else {
      let request_sent_time = new Date();
      /*Create the request using https.request and supplying it relevant data*/
      let authentication_req = https.request(options, (authentication_res) => {
        recieved_authentication(authentication_res,res,user_input,request_sent_time); /*Callback function to be triggered when we recieve a response*/
      });

      authentication_req.on('error', (e) => {
        console.log(e);
      });

      /*write function sends request and puts post_data into the body of the request since method is POST*/
      authentication_req.write(post_data);
      console.log("Requesting Token");
      authentication_req.end();
    }

    /*Callback function catches the result of the authentication request*/
    function recieved_authentication(authentication_res,res,user_input,request_sent_time){
      authentication_res.setEncoding("utf8");
      let body = "";
      authentication_res.on("data", data => {body += data;});
      authentication_res.on("end", () => {
        let authentication_res_data = JSON.parse(body); //convers back to a JS object

        let date = new Date().setHours(request_sent_time.getHours() + 1);
        let JSONdate = JSON.stringify(date);
        authentication_res_data.expiration = JSONdate;

        console.log(authentication_res_data);
        create_cache(authentication_res_data);
        create_search_req(authentication_res_data,res,user_input/*,request_sent_time*/);
      });
    }

    /*writes to cache (aka authentication_res.json)*/
    function create_cache(authentication_res_data){
      data = JSON.stringify(authentication_res_data, null, 2);
      fs.writeFile('./auth/authentication_res.json', data, (err) => {
        if (err) throw err;
        console.log('authentication data has been saved');
      });
    }

    /*start the search request*/
    function create_search_req(cached_auth, res, user_input) {

      /*artist search params*/
      console.log(`searching for ${user_input.artist}...`);
      let access_token = cached_auth.access_token;
      let spotify_url = "https://api.spotify.com/v1/search";

      let req_params = {
        q: user_input.artist,
        type: 'artist',
        access_token: access_token
      };

      req_params = querystring.stringify(req_params);
      let query_url = spotify_url + '?' + req_params;

      let img_path = `./artists/${user_input.artist}.jpg`;

      /*Check artist exists in cache*/
      let artist_cache_valid = false;
      let artist_cache = `./artists/${user_input.artist}_data.json`;

      if(fs.existsSync(artist_cache)) {
        content = fs.readFileSync(artist_cache, 'utf-8');
        cached_artist_data = JSON.parse(content); //converts content to js object
        artist_cache_valid = true;
        console.log('artist already existed in cache');
      }

      /*when artist is cached, create artist webpage else get artist from spotify and cache data*/
      if(artist_cache_valid) {
        create_artist_page(cached_artist_data);
      } else {

        /*get request has to go into conditional statement that checks cache*/
        let artist_req = https.get(query_url, artist_res => {

          /*callback function starts*/
          console.log("reponse status: " + artist_res.statusCode);

          let body = "";
          artist_res.on('data', (data) => {
            body += data;
          });

          let img = fs.createWriteStream(img_path,{'encoding':null});

          img.on('error', (e) => {
            console.log("There was an error: " + e);
          });

          img.on('finish', function() {

            /*cache artist data*/
            let artist_res_data = JSON.parse(body);
            artist_info = create_artist_cache(artist_res_data, user_input.artist);
            create_artist_page(artist_res_data);

            /*get image from cached data*/
            // let img_url = artist_info.img_url;
          });

          artist_res.pipe(img);
          /*callback function ends*/

        }); //get request

        artist_req.on('error', function(err){
          console.log("There was an error: " + err);
        });

      } //else statement

      /*artist cache*/
      function create_artist_cache(artist_data, artist_name) {
        data = JSON.stringify(artist_data, null, 2);
        fs.writeFile(`./artists/${artist_name}_data.json`, data, (err) => {
          if (err) throw err;
          console.log('artist data has been cached');
        });
      }

      /*Create artist webpage*/
      function create_artist_page(artist_res_data) {
        console.log(`creating webpage for ${user_input.artist}...`);
        console.log(artist_res_data.artists.items[0].genres);
        console.log(artist_res_data.artists.items[0].images[0].url);
        console.log(artist_res_data.artists.items[0].name);
        let webpage = `<h1>${artist_res_data.artists.items[0].name}</h1><p>${artist_res_data.artists.items[0].genres.join()}</p><img src=${artist_res_data.artists.items[0].images[0].url} />`

        console.log(webpage);
        res.render(webpage);
        // let search_stream = fs.createReadStream('./html/search-form.html');
      }

    } // create search request

    /*!!remove search_stream.pipe(res); in beginning when you stream artist page*/
  } //else if

}); //server

console.log('Now listening on port ' + port);
server.listen(port, server_address);

// image_stream.on('error', function(err) {
//   console.log(err);
//   res.writeHead(404);
//   return res.end();
// });
