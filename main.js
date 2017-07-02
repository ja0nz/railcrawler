const execFile = require("child_process").execFile;
const CHROMIUM = "/usr/bin/chromium";
const cheerio = require("cheerio");
import { bahnQs } from "./queryString";

import { futurize } from "futurize";
import { Future } from "ramda-fantasy";
import {
  replace,
  join,
  map,
  compose,
  split,
  reverse,
  isEmpty,
  filter,
  not
} from "ramda";

const getDay = x => x * 86400000 + Date.now();
const datePlus = x => new Date(getDay(x)).toLocaleDateString();

const composeQs = compose(
  bahnQs,
  join("."), //D.M.YYYY w/
  reverse, // [D, M, YYYY]
  split("-"), // [YYYY, M ,D]
  datePlus
);

const fetchNExtract = url => {
  const fetch = futurize(Future)(execFile);
  return fetch(CHROMIUM, ["--headless", "--disable-gpu", "--dump-dom", url])
    .map(cheerio.load)
    .map(dom => dom(".fareOutput").text().toString())
    .map(split(/\sEUR/g))
    .map(filter(compose(not, isEmpty)))
    .map(map(replace(",", ".")))
    .map(map(Number))
    .fork(console.error, prices => console.log(prices));
};

compose(fetchNExtract, composeQs)(20);
