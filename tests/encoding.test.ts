import test from "node:test";
import assert from "node:assert/strict";
import {
  encodeSyllable,
  encodePhrase,
  questionsFor,
  makeQueue,
  words,
  syllables,
} from "../src/encoding.ts";

test("encodes compound initials and shared finals against standard Flypy examples", () => {
  for (const [pinyin, code] of [
    ["shuang", "ul"],
    ["chuang", "il"],
    ["zhong", "vs"],
    ["qing", "qk"],
    ["kuai", "kk"],
    ["jiang", "jl"],
    ["guang", "gl"],
    ["xiong", "xs"],
    ["liu", "lq"],
    ["shui", "uv"],
    ["lian", "lm"],
    ["niao", "nn"],
    ["xie", "xp"],
    ["zun", "zy"],
  ])
    assert.equal(encodeSyllable(pinyin), code, pinyin);
});
test("encodes all independent zero-initial syllables, preserving two-letter forms", () => {
  for (const [pinyin, code] of [
    ["a", "aa"],
    ["o", "oo"],
    ["e", "ee"],
    ["ai", "ai"],
    ["ao", "ao"],
    ["an", "an"],
    ["ei", "ei"],
    ["en", "en"],
    ["er", "er"],
    ["ou", "ou"],
    ["ang", "ah"],
    ["eng", "eg"],
  ])
    assert.equal(encodeSyllable(pinyin), code, pinyin);
});
test("handles ü spellings and j q x y u exceptions without changing ue", () => {
  for (const [pinyin, code] of [
    ["nü", "nv"],
    ["nu:", "nv"],
    ["lv", "lv"],
    ["lüe", "lt"],
    ["ju", "jv"],
    ["qu", "qv"],
    ["xu", "xv"],
    ["yu", "yv"],
    ["xue", "xt"],
    ["jue", "jt"],
    ["yue", "yt"],
    ["yuan", "yr"],
    ["yun", "yy"],
    ["NU", "nu"],
  ])
    assert.equal(encodeSyllable(pinyin), code, pinyin);
});
test("phrase coding concatenates complete syllables instead of shape-code abbreviations", () => {
  assert.equal(encodePhrase(" ni hao "), "nihc");
  assert.equal(
    encodePhrase("xiao he shuang pin"),
    "xnh eul pb".replaceAll(" ", ""),
  );
  assert.equal(encodePhrase("an jing"), "anjk");
  assert.equal(encodePhrase("lv xing"), "lvxk");
});
test("rejects malformed, accented, empty, and unsupported syllables", () => {
  for (const input of ["", "nǐ", "<script>", "hello", "abc", "n", "aa", "123"])
    assert.throws(() => encodeSyllable(input), undefined, input);
});
test("each lesson has valid complete answers and curated phrase pronunciations", () => {
  assert.equal(
    questionsFor("initials").find((q) => q.pinyin === "zh")?.answer,
    "v",
  );
  assert.equal(
    questionsFor("finals").find((q) => q.pinyin === "iang")?.answer,
    "l",
  );
  assert.equal(questionsFor("zero").length, 12);
  for (const q of [...words, ...syllables]) {
    assert.equal(q.answer, encodePhrase(q.pinyin));
    assert.equal(q.answer.length, q.pinyin.split(" ").length * 2);
  }
  assert.equal(words.find((q) => q.label === "音乐")?.pinyin, "yin yue");
});
test("queue respects counts, empty pools, sequential cycling and random membership", () => {
  const pool = questionsFor("zero");
  assert.deepEqual(makeQueue([], 20, true), []);
  assert.deepEqual(makeQueue(pool, 14, false), [...pool, ...pool.slice(0, 2)]);
  const random = makeQueue(pool, 20, true);
  assert.equal(random.length, 20);
  assert.equal(new Set(random.slice(0, 12).map((q) => q.id)).size, 12);
  assert.ok(random.every((q) => pool.some((p) => p.id === q.id)));
});
