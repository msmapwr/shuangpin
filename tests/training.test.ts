import test from "node:test";
import assert from "node:assert/strict";
import {
  groupsFor,
  filterQuestions,
  customQuestion,
  parseCustomWords,
} from "../src/training.ts";
import { questionsFor, type LessonId } from "../src/encoding.ts";

test("focused groups cover every base question once without mixing nasal finals", () => {
  for (const id of ["initials", "finals", "zero"] as LessonId[]) {
    const grouped = groupsFor(id)
      .slice(1)
      .flatMap((g) => filterQuestions(id, g.id));
    assert.deepEqual(
      grouped.map((q) => q.id).sort(),
      questionsFor(id)
        .map((q) => q.id)
        .sort(),
    );
    assert.equal(new Set(grouped.map((q) => q.id)).size, grouped.length);
  }
  assert.deepEqual(
    filterQuestions("initials", "compound").map((q) => q.pinyin),
    ["zh", "ch", "sh"],
  );
  assert.deepEqual(
    filterQuestions("finals", "back")
      .map((q) => q.pinyin)
      .sort(),
    ["ang", "eng", "iang", "ing", "iong", "ong", "uang"],
  );
  assert.throws(() => filterQuestions("initials", "missing"), /不存在/);
  assert.deepEqual(filterQuestions("custom", "all"), []);
});
test("custom words normalize spelling and calculate whole phrase codes", () => {
  assert.equal(
    customQuestion("小鹤双拼", " XIAO  HE SHUANG PIN ").answer,
    "xnheulpb",
  );
  assert.deepEqual(
    customQuestion("绿色", "lü se"),
    customQuestion("绿色", "lu: se"),
  );
  assert.equal(customQuestion("学习", "xve xi").pinyin, "xue xi");
  assert.equal(
    customQuestion("你好你好你好你好", "ni hao ni hao ni hao ni hao").answer
      .length,
    16,
  );
});
test("custom parsing reports the invalid line, rejects mismatched readings and deduplicates", () => {
  const words = parseCustomWords("你好 | ni hao\n\n绿色｜lv se\n你好 | ni hao");
  assert.equal(words.length, 2);
  assert.equal(words[1].answer, "lvse");
  for (const line of [
    "你 | ni",
    "你好 | ni",
    "你好吗 | ni hao",
    "你好 | biong hao",
    "你好 | nǐ hǎo",
    "你好 | ni hao | extra",
    "<script> | ni hao",
    "你好你好你好你好你 | ni hao",
  ])
    assert.throws(() => parseCustomWords(`绿色 | lv se\n${line}`), /第 2 行/);
  assert.throws(() => parseCustomWords(" \n"), /至少/);
  assert.throws(
    () => parseCustomWords(Array(201).fill("你好 | ni hao").join("\n")),
    /200/,
  );
});
