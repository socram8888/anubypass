
Anubypass
=========

<p align="center">
  <img src="https://raw.githubusercontent.com/socram8888/anubypass/refs/heads/master/logo/full.svg" height="200">
</p>

A Chrome and Firefox extension to bypass [Anubis](https://anubis.techaro.lol/)'s
protection.

Anubis analyzes your browser's User Agent header. If you are on JavaScript-enabled browser,
it forces you a challenge before letting you through. On the contrary, if you are not, it
simply lets you walk through undisturbed.

To exploit this behaviour, this extension uses [a list of known protected websites](hosts.json)
for which, instead of sending your real browser User Agent that Anubis will know is JS-capable,
it sends instead a unique randomized User Agent that changes every four hours.

<p align="center">
  <img src="https://raw.githubusercontent.com/socram8888/anubypass/refs/heads/master/screenshot.png" height="400">
</p>

If you are a sysadmin and think that it's acceptable to make users wait while wasting precious
system resources on a protection so trivial to bypass that it took me around 100 lines of code, you
should consider switching to a crypto miner. At least you'd get some cash instead of a false sense
of security.

License
-------

The code in this repo is available under the WTFPL:

```
        DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE 
                    Version 2, December 2004 

 Copyright (C) 2004 Sam Hocevar <sam@hocevar.net> 

 Everyone is permitted to copy and distribute verbatim or modified 
 copies of this license document, and changing it is allowed as long 
 as the name is changed. 

            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE 
   TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION 

  0. You just DO WHAT THE FUCK YOU WANT TO.
```
