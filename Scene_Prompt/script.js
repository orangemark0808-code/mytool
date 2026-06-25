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
  cameraView: [
    ["指定なし", ""],
    ["正面ビュー", "front view"],
    ["サイドビュー", "side view"],
    ["斜めサイドビュー", "three-quarter side view"],
    ["背後から追う", "follow shot from behind"],
    ["肩越し", "over-the-shoulder view"],
    ["主観視点", "first-person point of view"]
  ],
  subjectPlacement: [
    ["中央配置", "centered composition"],
    ["左寄せ", "left-weighted composition"],
    ["右寄せ", "right-weighted composition"],
    ["被写体大きめ", "large subject framing"],
    ["被写体小さめ", "small subject framing"],
    ["表情が分かる大きさ", "large enough for the facial expression to be readable"]
  ],
  screenComposition: [
    ["自然な構図", "natural overall composition"],
    ["余白多め", "composition with generous negative space"],
    ["斜め構図", "diagonal composition"],
    ["奥行き構図", "composition with strong depth"],
    ["対称構図", "symmetrical composition"],
    ["背景広め", "wide background composition"],
    ["横方向に流れる構図", "horizontally flowing composition"]
  ],
  depth: [
    ["自然な奥行き", "natural depth"],
    ["遠近感を強調", "emphasized perspective"],
    ["広角っぽい迫力", "wide-angle impact"],
    ["望遠っぽい圧縮感", "telephoto compression"],
    ["背景をぼかす", "softly blurred background"],
    ["背景まで描き込む", "detailed background rendering"]
  ],
  motionBackground: [
    ["指定なし", ""],
    ["左右移動を横から見せる", "show left-to-right or right-to-left movement from the side"],
    ["斜め奥へ移動する", "show diagonal movement into the depth of the scene"],
    ["手前から奥へ進む", "show movement from the foreground into the background"],
    ["奥から手前へ進む", "show movement from the background toward the foreground"],
    ["背景を進行方向に流す", "let the background flow in the direction of movement"],
    ["カメラが回り込む", "show a slight orbiting camera feel around the subject"]
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
  ],
  alternateViewpoint: [
    ["正面", "front viewpoint"],
    ["横", "side viewpoint"],
    ["斜め前", "diagonal front viewpoint"],
    ["斜め後ろ", "diagonal back viewpoint"],
    ["俯瞰", "bird's-eye viewpoint"],
    ["あおり", "low-angle viewpoint"],
    ["アイレベル", "eye-level viewpoint"],
    ["部屋の入口側から見る", "view from the room entrance"],
    ["部屋の奥側から見る", "view from the back of the room"],
    ["窓側から見る", "view from the window side"],
    ["机側から見る", "view from the desk side"]
  ],
  timeOfDay: [
    ["なし", ""],
    ["朝", "morning"],
    ["昼", "daytime"],
    ["夕方", "evening"],
    ["夜", "night"],
    ["深夜", "late night"]
  ],
  weatherLight: [
    ["なし", ""],
    ["晴れ", "clear weather"],
    ["曇り", "cloudy light"],
    ["雨", "rainy ambience"],
    ["自然光", "natural light"],
    ["逆光", "backlight"],
    ["柔らかい光", "soft light"],
    ["暖色照明", "warm lighting"],
    ["蛍光灯", "fluorescent lighting"],
    ["暗めの照明", "dim lighting"]
  ],
  atmosphere: [
    ["なし", ""],
    ["静か", "quiet atmosphere"],
    ["温かい", "warm atmosphere"],
    ["清潔感がある", "clean atmosphere"],
    ["レトロ", "retro atmosphere"],
    ["生活感がある", "lived-in atmosphere"],
    ["不穏", "uneasy atmosphere"],
    ["かわいい", "cute atmosphere"],
    ["シンプル", "simple atmosphere"],
    ["落ち着いた", "calm atmosphere"],
    ["物語性がある", "story-rich atmosphere"]
  ]
};

const form = document.querySelector("#promptForm");
const aspectSelect = document.querySelector("#aspect");
const aspectDescription = document.querySelector("#aspectDescription");
const jpPrompt = document.querySelector("#jpPrompt");
const enPrompt = document.querySelector("#enPrompt");
const copyStatus = document.querySelector("#copyStatus");
const backgroundReferenceHint = document.querySelector("#backgroundReferenceHint");

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

function isOptionalChoice(value) {
  return value && value !== "指定なし" && value !== "なし";
}

function getOptionalJapanese(value) {
  return isOptionalChoice(value) ? value : "";
}

function getBackgroundEnvironmentJapanese(timeOfDay, weatherLight, atmosphere) {
  const details = compactJoin([
    isOptionalChoice(timeOfDay) ? `時間帯は${timeOfDay}` : "",
    isOptionalChoice(weatherLight) ? `天気・光は${weatherLight}` : "",
    isOptionalChoice(atmosphere) ? `雰囲気は${atmosphere}` : ""
  ], "、");

  return details ? `${details}。` : "";
}

function getBackgroundEnvironmentEnglish(timeOfDay, weatherLight, atmosphere) {
  const details = compactJoin([
    getOptionEnglish("timeOfDay", timeOfDay),
    getOptionEnglish("weatherLight", weatherLight),
    getOptionEnglish("atmosphere", atmosphere)
  ], ", ");

  return details ? `${details}.` : "";
}

function getMotionBackgroundNote(value) {
  const notes = {
    "左右移動を横から見せる": [
      "左右方向の移動は横から見た構図で描き、背景の廊下、壁、窓、床のラインを進行方向に沿って横へ伸ばす。",
      "For sideways movement, use a side-view composition and extend the hallway, walls, windows, and floor lines horizontally along the direction of travel."
    ],
    "斜め奥へ移動する": [
      "被写体が画面の斜め方向に奥へ進むように、床、壁、机、窓などの背景要素を一点透視に近い流れで配置する。",
      "Arrange the floor, walls, tables, windows, and other background elements with near one-point perspective so the subject moves diagonally deeper into the scene."
    ],
    "手前から奥へ進む": [
      "被写体が画面手前から奥へ進むように、背景のパース線と床の奥行きを進行方向に合わせる。",
      "Align the background perspective lines and floor depth so the subject moves from the foreground into the background."
    ],
    "奥から手前へ進む": [
      "被写体が奥から手前へ向かってくるように、背景のパース線と床の奥行きを進行方向に合わせる。",
      "Align the background perspective lines and floor depth so the subject moves from the background toward the foreground."
    ],
    "背景を進行方向に流す": [
      "背景の線や配置を被写体の進行方向に流し、動きの方向が一目で分かるようにする。",
      "Flow the background lines and layout in the subject's direction of movement so the motion direction is immediately clear."
    ],
    "カメラが回り込む": [
      "被写体の周囲をカメラが少し回り込むように、背景の水平線と床のパースをゆるくカーブさせ、立体感を出す。",
      "Create a slight orbiting camera feel around the subject by gently curving the horizon and floor perspective to emphasize dimensionality."
    ]
  };

  return notes[value] || ["", ""];
}

function getAspect() {
  return aspectOptions.find((option) => option.value === aspectSelect.value) || aspectOptions[0];
}

function compactJoin(parts, separator) {
  return parts.filter(Boolean).join(separator);
}

function stripTrailingPunctuation(text) {
  return text.replace(/[。．.、,\s]+$/g, "");
}

function translateFreeText(text, fallbackText) {
  const dictionary = {
    "オレンジ色のマスコットキャラクター": "an orange mascot character",
    "明るいカフェ": "a bright cafe",
    "夜の街": "a city street at night",
    "学校の廊下": "a school hallway",
    "日本のワンルーム": "a Japanese one-room apartment",
    "教室": "a classroom",
    "カフェ店内": "a cafe interior",
    "オフィス": "an office",
    "駅ホーム": "a train station platform",
    "夜の路地裏": "a narrow alley at night",
    "公園": "a park",
    "森の中": "inside a forest",
    "和室": "a traditional Japanese room",
    "北欧風の部屋": "a Scandinavian-style room",
    "木製の机がある": "with wooden desks",
    "大きな窓がある": "with large windows",
    "観葉植物がある": "with houseplants",
    "本棚がある": "with bookshelves",
    "生活感がある": "with a lived-in feeling",
    "整理された部屋": "an organized room",
    "古い建物": "an old building",
    "近未来的な内装": "a near-futuristic interior"
  };

  if (!text) return "";
  return dictionary[text] || fallbackText;
}

function preserveOriginalText(text, label) {
  return text ? `${label}: "${text}"` : "";
}

function hasReference(data, name) {
  return data.get(name) === "yes";
}

function getReferenceNotes(data) {
  const hasSubjectReference = hasReference(data, "subjectReference");
  const hasBackgroundReference = hasReference(data, "backgroundReference");
  const backgroundStyleNoteJp = hasSubjectReference
    ? "背景画像が写真でも、画面全体の画風、線のタッチ、色味は被写体の参照画像に合わせる。背景だけ別画風にしない。"
    : "背景画像が写真でも、全体を漫画調の画風に統一する。";
  const backgroundStyleNoteEn = hasSubjectReference
    ? "Even if it is a photo, match the entire image's art style, linework, and color palette to the subject reference image. Do not render the background in a separate style."
    : "Even if it is a photo, unify the entire image in a manga-style look.";

  return {
    jp: compactJoin([
      hasSubjectReference ? "被写体は添付画像を参照し、キャラクターの特徴、画風、線のタッチ、色味を画面全体に反映する。" : "",
      hasBackgroundReference ? `場所・背景は添付画像を参照する。${backgroundStyleNoteJp}` : ""
    ], "\n"),
    en: compactJoin([
      hasSubjectReference ? "Use the attached subject reference image to reflect the character design, art style, linework, and color palette." : "",
      hasBackgroundReference ? `Use the attached location/background reference image for the setting. ${backgroundStyleNoteEn}` : ""
    ], "\n")
  };
}

function getBackgroundCameraViewEnglish(value) {
  const map = {
    "指定なし": "",
    "正面ビュー": "front view",
    "サイドビュー": "side view",
    "斜めサイドビュー": "three-quarter side view",
    "背後から追う": "view from deeper inside the space",
    "肩越し": "view from behind a foreground object",
    "主観視点": "first-person environmental viewpoint"
  };

  return map[value] || getOptionEnglish("cameraView", value);
}

function getBackgroundMotionComposition(value) {
  const notes = {
    "左右移動を横から見せる": ["横方向の流れを感じる背景構図。", "side-flowing background composition"],
    "斜め奥へ移動する": ["斜め奥へ視線が抜ける背景構図。", "diagonal depth background composition"],
    "手前から奥へ進む": ["手前から奥へパースが伸びる背景構図。", "foreground-to-background perspective composition"],
    "奥から手前へ進む": ["奥から手前へ空間が広がる背景構図。", "background-to-foreground perspective composition"],
    "背景を進行方向に流す": ["空間の線がゆるやかに流れる背景構図。", "gently flowing environmental composition"],
    "カメラが回り込む": ["少し回り込んだカメラ感のある背景構図。", "subtle orbit-like background composition"]
  };

  return notes[value] || ["", ""];
}

function getBackgroundOnlyPrompt(data) {
  const background = String(data.get("background") || "").trim();
  const backgroundDetail = String(data.get("backgroundDetail") || "").trim();
  const aspect = getAspect();
  const cameraView = data.get("cameraView");
  const angle = data.get("angle");
  const screenComposition = data.get("screenComposition");
  const depth = data.get("depth");
  const motionBackground = data.get("motionBackground");
  const alternateViewpoint = data.get("alternateViewpoint");
  const timeOfDay = data.get("timeOfDay");
  const weatherLight = data.get("weatherLight");
  const atmosphere = data.get("atmosphere");
  const hasBackgroundReference = hasReference(data, "backgroundReference");
  const [jpMotionComposition, enMotionComposition] = getBackgroundMotionComposition(motionBackground);

  const jpReference = hasBackgroundReference
    ? compactJoin([
      "添付画像は場所・背景・空間構成だけの参照として使う。",
      "添付画像内に人物やキャラクターが写っていても参照せず、生成にも含めない。",
      "添付画像と同じカメラアングルや同じ構図は避ける。",
      "同じ場所を別視点から見た背景として、家具、部屋構造、光、色味、雰囲気を参考にする。",
      "新しい視点から環境を生成し、添付画像と同じ視点は使わない。"
    ], "\n")
    : "人物なしの背景専用シーンを生成する。";
  const jpLocation = background || "指定された場所・背景";
  const jpDetail = backgroundDetail ? `背景の詳細: ${backgroundDetail}。` : "";
  const jpCameraView = getOptionalJapanese(cameraView) ? `カメラビューは${cameraView}。` : "";
  const jpViewpoint = `別アングルは${alternateViewpoint}。`;

  jpPrompt.value = compactJoin([
    jpReference,
    "人物を含めない。キャラクターを含めない。",
    "背景、場所、空間、レイアウト、家具、構造、光、雰囲気だけを中心に描写する。",
    `${jpLocation}の背景画像。`,
    jpDetail,
    jpViewpoint,
    jpCameraView,
    `${angle}、${screenComposition}、${depth}。`,
    jpMotionComposition,
    getBackgroundEnvironmentJapanese(timeOfDay, weatherLight, atmosphere),
    `アスペクト比は${aspect.value}。`,
    "背景素材、漫画背景、イラスト背景、フォトリアル背景に使いやすい、空間の構造が読み取れる仕上がり。"
  ], "\n");

  const enReference = hasBackgroundReference
    ? compactJoin([
      "Use the attached image as a reference for the location and background only.",
      "Refer to the environment, room structure, furniture placement, lighting, colors, and atmosphere.",
      "Do not reference or include any people or characters from the attached image.",
      "Do not include any people or characters.",
      "Generate the same environment from a different angle than the attached image.",
      "Avoid recreating the exact same camera angle or composition as the reference image.",
      "Generate the environment from a new viewpoint.",
      "Do not use the same viewpoint as the attached image.",
      "Focus only on the background, environment, space, layout, furniture, lighting, and atmosphere."
    ], "\n")
    : compactJoin([
      "Generate a background-only scene with no people.",
      "Do not include any people or characters.",
      "Depict the specified location and environment.",
      "Focus only on the background, environment, space, layout, furniture, lighting, and atmosphere."
    ], "\n");
  const enLocation = translateFreeText(background, preserveOriginalText(background, "specified location/background")) || "the specified location and environment";
  const enDetail = backgroundDetail ? `Background details: ${translateFreeText(backgroundDetail, preserveOriginalText(backgroundDetail, "specified background details"))}.` : "";

  enPrompt.value = compactJoin([
    enReference,
    `A background-only scene of ${enLocation}.`,
    enDetail,
    `New viewpoint: ${getOptionEnglish("alternateViewpoint", alternateViewpoint)}.`,
    getBackgroundCameraViewEnglish(cameraView) ? `Camera view: ${getBackgroundCameraViewEnglish(cameraView)}.` : "",
    `${getOptionEnglish("angle", angle)}, ${getOptionEnglish("screenComposition", screenComposition)}, ${getOptionEnglish("depth", depth)}.`,
    enMotionComposition ? `${enMotionComposition}.` : "",
    getBackgroundEnvironmentEnglish(timeOfDay, weatherLight, atmosphere),
    `Use a ${aspect.en}.`,
    "Clean, versatile background image prompt for manga backgrounds, illustrated backgrounds, photorealistic backgrounds, and reusable environment art, no people, no characters."
  ], "\n");
}

function generatePrompt() {
  const data = new FormData(form);
  if (data.get("generationMode") === "background") {
    getBackgroundOnlyPrompt(data);
    return;
  }

  const subject = String(data.get("subject") || "").trim();
  const subjectPhrase = stripTrailingPunctuation(subject);
  const background = String(data.get("background") || "").trim();
  const aspect = getAspect();
  const shot = data.get("shot");
  const direction = data.get("direction");
  const angle = data.get("angle");
  const cameraView = data.get("cameraView");
  const subjectPlacement = data.get("subjectPlacement");
  const screenComposition = data.get("screenComposition");
  const depth = data.get("depth");
  const motionBackground = data.get("motionBackground");
  const effect = data.get("effect");
  const timeOfDay = data.get("timeOfDay");
  const weatherLight = data.get("weatherLight");
  const atmosphere = data.get("atmosphere");

  const jpSubject = subjectPhrase || "魅力的な被写体";
  const jpAction = subjectPhrase
    ? `最重要の表情・動作指定: ${subjectPhrase}。この表情と動作を必ず画面の主役として描く。`
    : "";
  const jpPriority = "最優先: 口の形、目、眉、姿勢、視線、両手の位置、手元の動作を大きく明確に描く。叫び、セリフ、感情語がある場合は、口を大きく開けた表情や短い吹き出しで分かるように表現する。";
  const jpSceneIntegration = "背景を単なる模様にせず、場所の構造が分かるように描く。背景の向き、床や壁のライン、光源を被写体の動きに合わせて自然に調整する。背景と被写体を同じカメラ位置、同じアイレベル、同じパース、同じ光源で統一する。足裏や体を床・机・壁など背景の空間に自然に接地させ、接地影と奥行きで浮いて見えないようにする。";
  const jpScaleLock = compactJoin([
    "【人物と部屋のスケール固定】",
    "主人公の頭身、体型、手足の長さ、デフォルメ度は添付の被写体参照画像を基準にする。",
    "背景・家具・机・椅子・PCの大きさは、参照画像の主人公が自然に座れるサイズに調整する。",
    "人物の体型に対して机や椅子が大きすぎたり小さすぎたりしないようにする。",
    "机、椅子、PC、ベッド、本棚、クローゼットは、主人公との大きさの関係が自然に見えるようにする。",
    "座った主人公の机天板の高さは、体型に対して自然な作業姿勢になる高さにする。",
    "椅子の背もたれは、主人公の背中に対して自然な高さにする。",
    "13インチPCは主人公の手元に対して自然な大きさにし、両手を置いて作業できるサイズにする。",
    "ベッドは人物より奥にある大きな家具として描き、人物と同じ平面に貼り付けたようにしない。",
    "人物、机、椅子、床、背景家具の接地感と奥行きを一致させる。",
    "人物をミニチュア化しない。",
    "人物を部屋に対して大きくしすぎない。",
    "家具を巨大化しない。",
    "PCを巨大化しない。"
  ], "\n");
  const jpCameraView = getOptionalJapanese(cameraView) ? `カメラビューは${cameraView}。` : "";
  const [jpMotionBackground, enMotionBackground] = getMotionBackgroundNote(motionBackground);
  const jpEnvironment = getBackgroundEnvironmentJapanese(timeOfDay, weatherLight, atmosphere);
  const jpEffectSentence = effect === "なし"
    ? `${depth}で、漫画演出は控えめにする。`
    : `${depth}で、${effect}を使った漫画演出を加える。`;
  const referenceNotes = getReferenceNotes(data);
  const jpSceneSubject = subjectPhrase ? `${subjectPhrase}シーン` : jpSubject;
  const jpSceneSentence = background
    ? `${background}を舞台に、${jpSceneSubject}を描いた漫画調のワンシーン画像。`
    : `${jpSceneSubject}を描いた漫画調のワンシーン画像。`;

  jpPrompt.value = compactJoin([
    referenceNotes.jp,
    jpAction,
    jpPriority,
    jpSceneIntegration,
    jpScaleLock,
    jpCameraView,
    jpMotionBackground,
    jpEnvironment,
    jpSceneSentence,
    `アスペクト比は${aspect.value}。`,
    `${shot}、${direction}、${angle}、被写体は${subjectPlacement}、画面全体は${screenComposition}。`,
    jpEffectSentence,
    "自然な日本の漫画らしい線、読みやすいシルエット、表情と空気感が伝わる仕上がり。"
  ], "\n");

  const enSubject = translateFreeText(subjectPhrase, preserveOriginalText(subjectPhrase, "the subject and action described in Japanese")) || "an appealing subject";
  const enLocation = background ? `set in ${translateFreeText(background, preserveOriginalText(background, "the location/background described in Japanese"))}` : "";
  const enEffect = effect === "なし" ? "with subtle manga presentation and no special manga effects" : `with ${getOptionEnglish("effect", effect)}`;
  const enAction = subjectPhrase
    ? "Most important action and expression: depict the specified subject/action as the main focus of the image."
    : "";
  const enPriority = "Top priority: clearly show the mouth shape, eyes, eyebrows, pose, gaze, both hand positions, and hand/action details. If the input includes shouting, dialogue, or an emotion word, express it with a wide-open mouth and, if useful, a short speech bubble.";
  const enSceneIntegration = "Do not render the background as a flat pattern; make the structure of the location readable. Adjust the direction of the background, floor and wall lines, and lighting naturally to match the subject's action. Integrate the subject and background with the same camera position, eye level, perspective, and light direction. Ground the feet and body naturally in the space with contact shadows and depth so the subject does not look pasted on or floating.";
  const enCameraView = getOptionEnglish("cameraView", cameraView) ? `Camera view: ${getOptionEnglish("cameraView", cameraView)}.` : "";
  const enEnvironment = getBackgroundEnvironmentEnglish(timeOfDay, weatherLight, atmosphere);

  enPrompt.value = compactJoin([
    referenceNotes.en,
    enAction,
    enPriority,
    enSceneIntegration,
    enCameraView,
    enMotionBackground,
    enEnvironment,
    `A manga-style single-scene image of ${enSubject}${enLocation ? `, ${enLocation}` : ""}.`,
    `Use a ${aspect.en}.`,
    `${getOptionEnglish("shot", shot)}, ${getOptionEnglish("direction", direction)}, ${getOptionEnglish("angle", angle)}, subject placement: ${getOptionEnglish("subjectPlacement", subjectPlacement)}, overall composition: ${getOptionEnglish("screenComposition", screenComposition)}.`,
    `${getOptionEnglish("depth", depth)}, ${enEffect}.`,
    "Clean Japanese manga linework, readable silhouette, expressive mood, polished image-generation prompt style."
  ], "\n");
}

function updateAspectDescription() {
  aspectDescription.textContent = getAspect().description;
}

function updateModeUi() {
  const data = new FormData(form);
  const isBackgroundMode = data.get("generationMode") === "background";

  document.querySelectorAll("[data-person-field]").forEach((field) => {
    field.hidden = false;
    field.classList.toggle("is-mode-disabled", isBackgroundMode);
    field.setAttribute("aria-disabled", String(isBackgroundMode));
    field.querySelectorAll("input, select, textarea").forEach((control) => {
      control.disabled = isBackgroundMode;
    });
  });

  document.querySelectorAll("[data-background-field]").forEach((field) => {
    field.hidden = false;
    field.classList.toggle("is-mode-disabled", !isBackgroundMode);
    field.setAttribute("aria-disabled", String(!isBackgroundMode));
    field.querySelectorAll("input, select, textarea").forEach((control) => {
      control.disabled = !isBackgroundMode;
    });
  });

  backgroundReferenceHint.textContent = isBackgroundMode
    ? "有の場合、添付画像の人物は参照せず、場所・背景・空間構成だけを参考にして別アングルの背景を作ります。"
    : "有の場合、添付画像の場所・背景をプロンプトに反映します。";
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

fillSelect("aspect", aspectOptions, "4:3 標準横構図");
fillSelect("shot", optionGroups.shot, "上半身");
fillSelect("direction", optionGroups.direction, "斜め前");
fillSelect("angle", optionGroups.angle, "アイレベル");
fillSelect("cameraView", optionGroups.cameraView, "指定なし");
fillSelect("subjectPlacement", optionGroups.subjectPlacement, "中央配置");
fillSelect("screenComposition", optionGroups.screenComposition, "自然な構図");
fillSelect("depth", optionGroups.depth, "自然な奥行き");
fillSelect("motionBackground", optionGroups.motionBackground, "指定なし");
fillSelect("effect", optionGroups.effect, "なし");
fillSelect("alternateViewpoint", optionGroups.alternateViewpoint, "斜め前");
fillSelect("timeOfDay", optionGroups.timeOfDay, "なし");
fillSelect("weatherLight", optionGroups.weatherLight, "なし");
fillSelect("atmosphere", optionGroups.atmosphere, "なし");
updateAspectDescription();
updateModeUi();
generatePrompt();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generatePrompt();
});

form.addEventListener("input", () => {
  updateAspectDescription();
  updateModeUi();
  generatePrompt();
});

form.addEventListener("change", () => {
  updateAspectDescription();
  updateModeUi();
  generatePrompt();
});

document.querySelector("#resetButton").addEventListener("click", () => {
  form.reset();
  document.querySelector("#subject").value = "";
  const backgroundDetailInput = document.querySelector("#backgroundDetail");
  if (backgroundDetailInput) backgroundDetailInput.value = "";
  aspectSelect.value = "4:3 標準横構図";
  updateAspectDescription();
  updateModeUi();
  generatePrompt();
});

document.querySelectorAll(".copy-button").forEach((button) => {
  button.addEventListener("click", () => copyText(button.dataset.copyTarget));
});
