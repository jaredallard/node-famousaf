# node-famousaf

A NPM module to interact with https://famous.af/'s API.

## Installation

```bash
npm install --save famousaf
```

## NOTICE

**THIS IS BASED ON AN UNOFFICIAL UNDOCUMENTED API.**

**API CALLS ARE SUBJECT TO BREAKING AND FEATURES REMOVED AT ANYTIME.**

**I WILL DO MY BEST TO IMPLEMENT WORKAROUNDS AND FIXES.**

You have been *warned*.

## Authentication

As of right now, the only way to use this is to login to Famous via a browser
and to then watch XHR requests until you find one with a Cookie (me is a good one)

Then, take this headers' contents and treat them as a password. The problem with
this is that cookies expire. I will be working with Famous too find out another
way and look at traffic to examine other factors.

The last method I will resort to is grabbing the consumer_keys for twitter
and using phantomjs to go through the entire Twitter Auth scheme. This, however,
is slow and painful to work with.

## Usage

```js
'use strict';

const Famous = require('famousaf');

let famous = new Famous('mycookie');

//
// node-famousaf supports promises or standard callback format!
//

// Example #1: Promises
//
// NOTE: resp contains resp.data, resp.res (res is request#res)
//
famous.post('me', {})
  .catch(err => {
    console.error(err);
  })
  .then(resp => {
    console.log('got', resp.data);
  });

// Example #2: Use callbacks. can also use famous#post
famous.post('me', {}, (err, body, res) => {
  if(err) {
    return console.error(err);
  }

  console.log('got', body);
});

// Become a fan!
famous.fan('rylorjs')
  .catch(err => {
    return console.error('error', err);
  })
  .then(resp => {
    return console.log('got', resp.data);
  })

famous.whois('rylor')
  .catch(err => {
    return console.error('error', err);
  })
  .then(resp => {
    return console.log('got', resp.data);
  })

```

## Reporting Errors

Oh no! You ran into an error!

Here's what you should before reporting an error,

First, enable debug logging by doing either:

```bash
# Linux
export DEBUG=famous
```

or

```cmd
:: Windows
SET DEBUG=famous
```

Then make sure to write an issue with a format like:

```md
## What was expected

<expected output or action>

## What went wrong

<crashed or etc>

## Log

<code formatted output of program>
```

## Donate

I'm a high schooler who can't really join the big leagues because, well, I'm
in high school. I also work a part time job so I don't have much time to devote
to programming, if you like what I do or use it, please feel free to Donate
to me so I can maybe even make enough money on my work to not have to work a part time job!

**Bitcoin**: `1QKpBWmA23SwiZ27Y8xrQPYuGo7eSrA4TZ`

## License

MIT
