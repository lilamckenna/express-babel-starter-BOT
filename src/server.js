import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import botkit from 'botkit';
import dotenv from 'dotenv';
import yelp from 'yelp-fusion';
// import { find } from 'async';

dotenv.config({ silent: true });


// initialize
const app = express();

// sweet!
// botkit controller
const controller = botkit.slackbot({
  debug: false,
});


// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM((err) => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});


const yelpClient = yelp.client(process.env.YELP_API_KEY);

controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      let typeFood = '';
      let zipCode = '';
      bot.reply(message, `Hello, ${res.user.name}!`);
      bot.reply(message, 'It sounds like you have food on the mind.');
      bot.reply('what kind of food are you in the mood for?', (response, convorsation) => {
        typeFood = response.text;
        convorsation.next();
      });
      bot.reply('sweet! What is your zip code? I\'ll look around you :) ', (newResponse, convo) => {
        zipCode = newResponse.text;
        yelpClient.search({
          term: typeFood,
          location: zipCode,
        }).then((response) => {
          // Used this to understand what i am doing- https://stackoverflow.com/questions/9873964/yelp-googles-api-for-restaurants-help
          // and this -https://www.yelp.com/developers/documentation/v3/business_search
          //  response.jsonBody.businesses.forEach(business => {
          const searchQuery = {
            attactments: [
              {
                title: response.jsonBody.businesses[0].name,
                pretext: 'this is the best one. lets see if you like it! ',
                title_link: response.jsonBody.businesses[0].url,
                img_url: response.jsonBody.businesses[0].image_url,
                fallback: 'sorry dude. nothing came up',
                text: `The rating is: ${response.jsonBody.businesses[0].rating}`,
              },
            ],
          };
          convo.reply(searchQuery);
          convo.next();
        }).catch((e) => {
          convo.reply('you hate to see it but there are no food recs around you. thanks for tryin though :) !! ');
          convo.next();
        });
      });
    } else {
      bot.reply(message, 'Hello there! I do not know who you are!');
    }
  });
});


controller.hears('wake up', (bot, message) => {
  bot.reply(message, 'you got me. sorry was taking a quick snooze.');
});


controller.on('outgoing_webhook', (bot, message) => {
  bot.replyPublic(message, 'whassssuppppp');
});


// enable/disable cross origin resource sharing if necessary
app.use(cors());

// enable/disable http request logging
app.use(morgan('dev'));

// enable only if you want templating
app.set('view engine', 'ejs');

// enable only if you want static assets from folder static
app.use(express.static('static'));

// this just allows us to render ejs from the ../app/views directory
app.set('views', path.join(__dirname, '../src/views'));

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// additional init stuff should go before hitting the routing

// default index route
app.get('/', (req, res) => {
  res.send('hi');
});

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090;
app.listen(port);

console.log(`listening on: ${port}`);
