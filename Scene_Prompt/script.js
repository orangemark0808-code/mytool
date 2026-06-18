const aspectOptions = [
  { value: "1:1 正方形・SNS向き", en: "1:1 square aspect ratio", description: "アイコン、SNS投稿、サムネイルに使いやすい正方形です。" },
  { value: "4:5 縦寄り・SNS向き", en: "4:5 vertical social media aspect ratio", description: "SNSフィードで大きく見せたい縦寄り投稿に向いています。" },
  { value: "3:4 縦構図・キャラ向き", en: "3:4 vertical character-focused aspect ratio", description: "キャラクターを自然に大きく見せたい縦構図です。" },
  { value: "2:3 縦長・全身向き", en: "2:3 tall full-body aspect ratio", description: "全身や衣装を入れたいときに向いた縦長比率です。" },
  { value: "9:16 スマホ縦長", en: "9:16 smartphone vertical aspect ratio", description: "スマホ表示や縦長SNS投稿に向いた比率です。" },
  { value: "4:3 標準横構図", en: "4:3 standard horizontal aspect ratio", description: "背景と人物のバランスを取りやすい標準的な横構図です。" },
  { value: "3:2 自然な横構図", en: "3:2 natural horizontal aspect ratio", description: "写真のように自然で扱いやすい横構図です。" },
  { value: "16:9 映画風ワイド", en: "16:9 cinematic wide aspect ratio", description: "映画のワンシーン風に見せやすいワイド比率です。" },
  { value: "21:9 超ワイド映画風", en: "21:9 ultra-wide cinematic aspect ratio", description: "空間の広がりや迫力を強く出せる超ワイド比率です。" }
];

const optionGroups = {
  shot: [
    ["顔アップ", "close-up of the face"],
    ["目元アップ", "extreme close-up of the eyes"],
    ["手元アップ", "close-up of the hands"],
    ["バストアップ", "bust shot"],
    ["上半身", "upper-body shot"],
    ["膝上", "knee-up shot"],
    ["全身", "full-body shot"],
    ["遠景", "long shot"]
  ],
  direction: [
    ["正面", "front-facing"],
    ["横顔", "profile view"],
    ["斜め前", "three-quarter front view"],
    ["斜め後ろ", "three-quarter back view"],
    ["後ろ姿", "back view"]
  ],
  angle: [
    ["アイレベル", "eye-level camera angle"],
    ["見上げ", "low-angle view"],
    ["見下ろし", "high-angle view"],
    ["俯瞰", "bird's-eye view"],
    ["あおり", "dramatic low-angle shot"],
    ["真上", "top-down view"]
  ],
  composition: [
    ["中央配置", "centered composition"],
    ["左寄せ", "left-weighted composition"],
    ["右寄せ", "right-weighted composition"],
    ["余白多め", "composition with generous negative space"],
    ["斜め構図", "diagonal composition"],
    ["奥行き構図", "composition with strong depth"],
    ["対称構図", "symmetrical composition"],
    ["背景広め", "wide background composition"],
    ["被写体大きめ", "large subject framing"]
  ],
  depth: [
    ["自然な奥行き", "natural depth"],
    ["遠近感を強調", "emphasized perspective"],
    ["広角っぽい迫力", "wide-angle impact"],
    ["望遠っぽい圧縮感", "telephoto compression"],
    ["背景をぼかす", "softly blurred background"],
    ["背景まで描き込む", "detailed background rendering"]
  ],
  effect: [
    ["なし", "no manga effects"],
    ["集中線", "dramatic focus lines"],
    ["スピード線", "speed lines"],
    ["流線", "motion streaks"],
    ["効果音あり", "visible sound effect lettering"],
    ["感情エフェクト", "expressive emotion effects"],
    ["背景白抜き", "white cutout background effect"],
    ["黒ベタ背景", "solid black manga background"],
    ["トーン背景", "screen-tone background"]
  ]
};

const form = document.querySelector("#promptForm");
const aspectSelect = document.querySelector("#aspect");
const aspectDescription = document.querySelector("#aspectDescription");
const jpPrompt = document.querySelector("#jpPrompt");
const enPrompt = document.querySelector("#enPrompt");
const copyStatus = document.querySelector("#copyStatus");
const subjectReference = document.querySelector("#subjectReference");
const backgroundReference = document.querySelector("#backgroundReference");
const subjectPreview = document.querySelector("#subjectPreview");
const backgroundPreview = document.querySelector("#backgroundPreview");

function fillSelect(selectId, options, defaultValue) {
  const select = document.querySelector(`#${selectId}`);
  select.innerHTML = "";
  options.forEach((option) => {
    const item = document.createElement("option");
    const value = Array.isArray(option) ? option[0] : option.value;
    item.value = value;
    item.textContent = value;
    if (value === defaultValue) item.selected = true;
    select.appendChild(item);
  });
}

function getOptionEnglish(group, value) {
  const found = optionGroups[group].find((option) => option[0] === value);
  return found ? found[1] : value;
}

function getAspect() {
  return aspectOptions.find((option) => option.value === aspectSelect.value) || aspectOptions[0];
}

function compactJoin(parts, separator) {
  return parts.filter(Boolean).join(separator);
}

function translateFreeText(text, fallbackText) {
  const dictionary = {
    "オレンジ色のマスコットキャラクター": "an orange mascot character",
    "明るいカフェ": "a bright cafe",
    "夜の街": "a city street at night",
    "学校の廊下": "a school hallway"
  };

  if (!text) return "";
  return dictionary[text] || fallbackText;
}

function hasFile(input) {
  return input.files && input.files.length > 0;
}

function getReferenceNotes() {
  const hasSubjectReference = hasFile(subjectReference);
  const hasBackgroundReference = hasFile(backgroundReference);

  return {
    jp: compactJoin([
      hasSubjectReference ? "添付した被写体の参照画像から、画風、線のタッチ、色味、質感を参照する。" : "",
      hasBackgroundReference ? "添付した場所の参照画像は背景や空間情報として使う。場所の画像が写真でも、画風は被写体の参照画像を優先する。" : ""
    ], "\n"),
    en: compactJoin([
      hasSubjectReference ? "Use the attached subject reference image for the visual style, linework, color palette, and texture." : "",
      hasBackgroundReference ? "Use the attached location reference image for the background and spatial information. Even if the location reference is a photo, keep the style based on the subject reference image." : ""
    ], "\n")
  };
}

function generatePrompt() {
  const data = new FormData(form);
  const subject = String(data.get("subject") || "").trim();
  const background = String(data.get("background") || "").trim();
  const aspect = getAspect();
  const shot = data.get("shot");
  const direction = data.get("direction");
  const angle = data.get("angle");
  const composition = data.get("composition");
  const depth = data.get("depth");
  const effect = data.get("effect");

  const jpSubject = subject || "魅力的な被写体";
  const jpLocation = background ? `${background}を舞台にした` : "";
  const jpEffect = effect === "なし" ? "漫画演出は控えめに" : `${effect}を使った漫画演出`;
  const referenceNotes = getReferenceNotes();

  jpPrompt.value = compactJoin([
    `${jpLocation}${jpSubject}の漫画調のワンシーン画像。`,
    `アスペクト比は${aspect.value}。`,
    referenceNotes.jp,
    `${shot}、${direction}、${angle}、${composition}。`,
    `${depth}で、${jpEffect}を加える。`,
    "自然な日本の漫画らしい線、読みやすいシルエット、表情と空気感が伝わる仕上がり。"
  ], "\n");

  const enSubject = translateFreeText(subject, "the specified subject") || "an appealing subject";
  const enLocation = background ? `set in ${translateFreeText(background, "the specified location or background")}` : "";
  const enEffect = effect === "なし" ? "with subtle manga presentation and no special manga effects" : `with ${getOptionEnglish("effect", effect)}`;

  enPrompt.value = compactJoin([
    `A manga-style single-scene image of ${enSubject}${enLocation ? `, ${enLocation}` : ""}.`,
    `Use a ${aspect.en}.`,
    referenceNotes.en,
    `${getOptionEnglish("shot", shot)}, ${getOptionEnglish("direction", direction)}, ${getOptionEnglish("angle", angle)}, ${getOptionEnglish("composition", composition)}.`,
    `${getOptionEnglish("depth", depth)}, ${enEffect}.`,
    "Clean Japanese manga linework, readable silhouette, expressive mood, polished image-generation prompt style."
  ], "\n");
}

function updatePreview(input, preview) {
  const file = input.files && input.files[0];
  if (!file) {
    preview.hidden = true;
    preview.innerHTML = "";
    return;
  }

  const image = document.createElement("img");
  image.alt = file.name;
  image.src = URL.createObjectURL(file);
  image.onload = () => URL.revokeObjectURL(image.src);
  preview.innerHTML = "";
  preview.appendChild(image);
  preview.hidden = false;
}

function updateAspectDescription() {
  aspectDescription.textContent = getAspect().description;
}

async function copyText(targetId) {
  const textarea = document.querySelector(`#${targetId}`);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    await navigator.clipboard.writeText(textarea.value);
  } catch (error) {
    document.execCommand("copy");
  }

  copyStatus.textContent = "コピーしました";
  window.clearTimeout(copyStatus.hideTimer);
  copyStatus.hideTimer = window.setTimeout(() => {
    copyStatus.textContent = "";
  }, 1800);
}

fillSelect("aspect", aspectOptions, "9:16 スマホ縦長");
fillSelect("shot", optionGroups.shot, "上半身");
fillSelect("direction", optionGroups.direction, "斜め前");
fillSelect("angle", optionGroups.angle, "アイレベル");
fillSelect("composition", optionGroups.composition, "中央配置");
fillSelect("depth", optionGroups.depth, "自然な奥行き");
fillSelect("effect", optionGroups.effect, "なし");
updateAspectDescription();
generatePrompt();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generatePrompt();
});

form.addEventListener("input", () => {
  updateAspectDescription();
  generatePrompt();
});

form.addEventListener("change", () => {
  updateAspectDescription();
  updatePreview(subjectReference, subjectPreview);
  updatePreview(backgroundReference, backgroundPreview);
  generatePrompt();
});

document.querySelector("#resetButton").addEventListener("click", () => {
  form.reset();
  document.querySelector("#subject").value = "オレンジ色のマスコットキャラクター";
  aspectSelect.value = "9:16 スマホ縦長";
  subjectReference.value = "";
  backgroundReference.value = "";
  updatePreview(subjectReference, subjectPreview);
  updatePreview(backgroundReference, backgroundPreview);
  updateAspectDescription();
  generatePrompt();
});

document.querySelectorAll(".copy-button").forEach((button) => {
  button.addEventListener("click", () => copyText(button.dataset.copyTarget));
});
