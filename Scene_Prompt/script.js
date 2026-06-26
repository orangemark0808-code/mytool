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
    ["デフォルメキャラ優先", "composition prioritized for deformed character proportions"],
    ["余白多め", "composition with generous negative space"],
    ["斜め構図", "diagonal composition"],
    ["奥行き構図", "composition with strong depth"],
    ["対称構図", "symmetrical composition"],
    ["背景広め", "wide background composition"],
    ["横方向に流れる構図", "horizontally flowing composition"]
  ],
  depth: [
    ["自然な奥行き", "natural depth"],
    ["デフォルメ向け浅い奥行き", "shallow depth for deformed characters"],
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
  backgroundReferenceUsage: [
    ["背景全体を参照", "use the whole background reference"],
    ["画面内に入る範囲だけ参照", "use only the visible area that fits in the frame"],
    ["接触家具・作業面だけ参照", "use only contact furniture and work surfaces"],
    ["小物・道具だけ参照", "use only props and tools"],
    ["配置図として参照", "use as a layout diagram"],
    ["空間の前後関係だけ参照", "use only spatial depth order"]
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
  ],
  scalePreset: [
    ["指定なし", ""],
    ["参照画像の体型を維持", "preserve the body proportions from the subject reference"],
    ["5頭身デフォルメ", "five-head-tall deformed character proportions"],
    ["ちびキャラ", "chibi character proportions"],
    ["マスコット体型", "mascot-like body proportions"],
    ["通常人物", "standard human proportions"]
  ],
  workSurfaceHeight: [
    ["指定なし", ""],
    ["手元の動作に合わせる", "fit the work or contact surface height to the character's hand action"],
    ["主人公サイズの適正高さの作業面", "character-scaled work surface at an appropriate height"],
    ["接触面を人物サイズにする", "scale contact surfaces to the character"],
    ["大人用の高い作業面を避ける", "avoid adult-sized high work surfaces"],
    ["立ち作業：肘の少し下", "standing work surface slightly below the elbows"],
    ["立ち作業：みぞおち下", "standing work surface below the solar plexus"],
    ["立ち作業：腰より少し上", "standing work surface slightly above the waist"],
    ["座り作業：自然な机高", "natural desk height for a seated posture"]
  ],
  propScale: [
    ["指定なし", ""],
    ["手の大きさに合わせる", "scale props and tools to the character's hands"],
    ["背景小物を控えめにする", "keep background props modest in size"],
    ["人物基準で小さめ", "make props slightly smaller based on the character scale"],
    ["巨大化禁止", "avoid oversized props and tools"]
  ],
  unwantedFurniture: [
    ["指定なし", ""],
    ["入力にない物を追加しない", "do not add furniture, tools, or objects that are not requested"],
    ["座る指定がない場合は椅子を描かない", "do not draw chairs, stools, or benches unless the character is sitting"],
    ["椅子・スツールを目立たせない", "do not make chairs or stools visually prominent"],
    ["人物スケールの基準にしない", "do not use chairs, stools, or background furniture as the main scale reference"]
  ],
  backgroundStructureScale: [
    ["指定なし", ""],
    ["人物に合わせた背景スケール", "scale the background structure to the character"],
    ["背景家具を高くしすぎない", "do not make background furniture too tall"],
    ["背景設備を大きくしすぎない", "do not make background fixtures oversized"],
    ["背景で人物を小さく見せない", "do not make the character look small because of the background scale"]
  ]
};

const personBackgroundScaleDefaults = {
  scalePreset: "指定なし",
  workSurfaceHeight: "指定なし",
  propScale: "指定なし",
  unwantedFurniture: "指定なし",
  backgroundStructureScale: "指定なし"
};

const deformedScalePresets = new Set([
  "参照画像の体型を維持",
  "5頭身デフォルメ",
  "ちびキャラ",
  "マスコット体型"
]);


const closeShotSet = new Set(["顔アップ", "目元アップ", "手元アップ", "バストアップ"]);
const upperShotSet = new Set(["上半身"]);
const partialBodyShotSet = new Set(["膝上"]);
const fullBodyShotSet = new Set(["全身"]);
const longShotSet = new Set(["遠景"]);
const wideAspectSet = new Set(["3:2 自然な横構図", "16:9 映画風ワイド", "21:9 超ワイド映画風"]);
const ultraWideAspectSet = new Set(["21:9 超ワイド映画風"]);
const verticalAspectSet = new Set(["4:5 縦寄り・SNS向き", "3:4 縦構図・キャラ向き", "2:3 縦長・全身向き", "9:16 スマホ縦長"]);
const squareAspectSet = new Set(["1:1 正方形・SNS向き"]);
const characterCloseRecommendedAspects = new Set(["1:1 正方形・SNS向き", "4:5 縦寄り・SNS向き", "3:4 縦構図・キャラ向き", "4:3 標準横構図"]);
const fullBodyRecommendedAspects = new Set(["3:4 縦構図・キャラ向き", "2:3 縦長・全身向き", "9:16 スマホ縦長"]);
const backgroundRecommendedAspects = new Set(["16:9 映画風ワイド", "4:3 標準横構図", "3:2 自然な横構図", "21:9 超ワイド映画風"]);

const form = document.querySelector("#promptForm");
const aspectSelect = document.querySelector("#aspect");
const aspectDescription = document.querySelector("#aspectDescription");
const jpPrompt = document.querySelector("#jpPrompt");
const enPrompt = document.querySelector("#enPrompt");
const copyStatus = document.querySelector("#copyStatus");
const backgroundReferenceHint = document.querySelector("#backgroundReferenceHint");
const backgroundReferenceUsageWrap = document.querySelector("#backgroundReferenceUsageWrap");
const backgroundReferenceUsageSelect = document.querySelector("#backgroundReferenceUsage");
const backgroundReferenceUsageHint = document.querySelector("#backgroundReferenceUsageHint");
const consistencyCard = document.querySelector("#consistencyCard");
const consistencySummary = document.querySelector("#consistencySummary");
const consistencyList = document.querySelector("#consistencyList");

function fillSelect(selectId, options, defaultValue) {
  const select = document.querySelector(`#${selectId}`);
  select.innerHTML = "";
  options.forEach((option) => {
    const item = document.createElement("option");
    const value = Array.isArray(option) ? option[0] : option.value;
    item.value = value;
    item.textContent = value;
    if (value === defaultValue) {
      item.selected = true;
      item.defaultSelected = true;
    }
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

function resetPersonBackgroundScaleDefaults() {
  Object.entries(personBackgroundScaleDefaults).forEach(([selectId, value]) => {
    const select = document.querySelector(`#${selectId}`);
    if (select) select.value = value;
  });
}

function getDetailedScaleJapanese(scaleData) {
  const scalePresetMap = {
    "参照画像の体型を維持": "参照画像の体型を維持し、胴体を背景や接触面に合わせて伸ばさない。",
    "5頭身デフォルメ": "5頭身デフォルメとして、頭を大きく、首と胴体を短く保つ。",
    "ちびキャラ": "ちびキャラ体型として、体を小さくまとめ、胴体を伸ばさない。",
    "マスコット体型": "マスコット風の体型を保ち、背景や小物に合わせて長身化しない。",
    "通常人物": "主人公は通常人物に近い自然な体型として描く。"
  };
  const workSurfaceHeightMap = {
    "手元の動作に合わせる": "接触面は現在のポーズと手元の動作に合う高さ・位置にする。",
    "主人公サイズの適正高さの作業面": "机、台、カウンターは標準成人サイズではなく、主人公サイズの適正高さの作業面として描く。",
    "接触面を人物サイズにする": "接触面は人物サイズにし、主人公が自然に届く位置に置く。",
    "大人用の高い作業面を避ける": "大人用の高すぎるカウンターや胸の高さの作業台を基準にしない。",
    "立ち作業：肘の少し下": "立ち作業の接触面は主人公の肘の少し下に置く。",
    "立ち作業：みぞおち下": "立ち作業の接触面は主人公のみぞおち下あたりに置く。",
    "立ち作業：腰より少し上": "立ち作業の接触面は主人公の腰より少し上に置く。",
    "座り作業：自然な机高": "座り作業の机や接触面は主人公の肘の少し下に置く。"
  };
  const propScaleMap = {
    "手の大きさに合わせる": "手で触れる道具や小物は主人公の手の大きさに合わせる。",
    "背景小物を控えめにする": "背景小物は控えめな大きさと情報量にする。",
    "人物基準で小さめ": "小物や周辺物は人物基準でやや小さめに描く。",
    "巨大化禁止": "道具、小物、持ち物、周辺物を巨大化しない。"
  };
  const unwantedFurnitureMap = {
    "入力にない物を追加しない": "入力にない家具、道具、小物、背景要素を無理に追加しない。",
    "座る指定がない場合は椅子を描かない": "座る指定がない場合、椅子、スツール、ベンチを描かない。",
    "椅子・スツールを目立たせない": "椅子やスツールを主人公の近くに大きく描かない。",
    "人物スケールの基準にしない": "椅子や背景要素を人物スケールの基準にしない。"
  };
  const backgroundStructureScaleMap = {
    "人物に合わせた背景スケール": "背景構造は人物がミニチュアに見えないスケールにする。",
    "背景家具を高くしすぎない": "棚、机、台、看板、手すりなどの背景要素を高くしすぎない。",
    "背景設備を大きくしすぎない": "窓、ドア、設備、自然物、背景小物を大きくしすぎない。",
    "背景で人物を小さく見せない": "背景の高さや奥行きで主人公を小さく見せない。"
  };

  return compactJoin([
    "【詳細スケール補正】",
    scalePresetMap[scaleData.scalePreset],
    workSurfaceHeightMap[scaleData.workSurfaceHeight],
    propScaleMap[scaleData.propScale],
    unwantedFurnitureMap[scaleData.unwantedFurniture],
    backgroundStructureScaleMap[scaleData.backgroundStructureScale]
  ], "\n");
}

function getDetailedScaleEnglish(scaleData) {
  const scalePresetMap = {
    "参照画像の体型を維持": "Preserve the body proportions from the subject reference and do not lengthen the torso to fit the background or contact surfaces.",
    "5頭身デフォルメ": "Keep five-head-tall deformed proportions with a large head, short neck, and short torso.",
    "ちびキャラ": "Keep compact chibi proportions and do not stretch the torso.",
    "マスコット体型": "Keep mascot-like proportions and do not shift into a taller human balance.",
    "通常人物": "Draw the character with natural proportions close to a standard human."
  };
  const workSurfaceHeightMap = {
    "手元の動作に合わせる": "Set contact surfaces to the height and position required by the current hand action.",
    "主人公サイズの適正高さの作業面": "Draw desks, tables, counters, and platforms as character-scaled work surfaces at an appropriate height.",
    "接触面を人物サイズにする": "Scale contact surfaces to the character and place them within natural reach.",
    "大人用の高い作業面を避ける": "Do not use adult-sized high counters or chest-height workbenches as the scale reference.",
    "立ち作業：肘の少し下": "For standing work, keep the contact surface slightly below the character's elbows.",
    "立ち作業：みぞおち下": "For standing work, keep the contact surface below the character's solar plexus.",
    "立ち作業：腰より少し上": "For standing work, keep the work surface or contact surface slightly above the character's waist.",
    "座り作業：自然な机高": "For seated work, keep the desk or contact surface slightly below the character's elbows."
  };
  const propScaleMap = {
    "手の大きさに合わせる": "Scale handled tools and props to the character's hands.",
    "背景小物を控えめにする": "Keep background props modest in size and visual weight.",
    "人物基準で小さめ": "Make props and surrounding objects slightly smaller based on the character scale.",
    "巨大化禁止": "Do not make tools, props, handheld objects, or surrounding objects oversized."
  };
  const unwantedFurnitureMap = {
    "入力にない物を追加しない": "Do not add unrequested furniture, tools, props, or background elements.",
    "座る指定がない場合は椅子を描かない": "Do not add chairs, stools, or benches unless the character is sitting.",
    "椅子・スツールを目立たせない": "Do not draw chairs or stools large near the character.",
    "人物スケールの基準にしない": "Do not use chairs or background elements as the main scale reference."
  };
  const backgroundStructureScaleMap = {
    "人物に合わせた背景スケール": "Keep the background structure scaled so the character does not look miniature.",
    "背景家具を高くしすぎない": "Do not make shelves, desks, signs, railings, or other background elements too tall.",
    "背景設備を大きくしすぎない": "Do not make fixtures, doors, windows, natural objects, or background props oversized.",
    "背景で人物を小さく見せない": "Do not make the character look small because of background height or depth."
  };

  return compactJoin([
    "Detailed scale correction:",
    scalePresetMap[scaleData.scalePreset],
    workSurfaceHeightMap[scaleData.workSurfaceHeight],
    propScaleMap[scaleData.propScale],
    unwantedFurnitureMap[scaleData.unwantedFurniture],
    backgroundStructureScaleMap[scaleData.backgroundStructureScale]
  ], "\n");
}

function getSpatialRelationLockJapanese(data) {
  const relation = String(data.get("spatialRelation") || "").trim();
  if (!shouldUseSpatialRelationLock(data)) return "";

  const relationLines = relation
    ? [
      `指定された画面内の前後関係: ${stripTrailingPunctuation(relation)}。`,
      "この前後関係を優先し、他の背景要素は画面端、横、またはさらに奥に控えめに配置する。"
    ]
    : [];

  return compactJoin([
    "【空間関係・前後関係固定】",
    "参照画像は部屋に限らず、屋外、店内、街、自然、乗り物、建物、机上などの場所・背景・空間構成として扱う。",
    "参照画像の要素をただ横に並べず、選択したカメラ位置から見た前景・中景・背景の奥行きに変換する。",
    "画面内で、被写体の手前、横、背後、さらに奥に何があるかを整理して描く。",
    "被写体の背後側には、カメラから見て実際に重なる背景要素を配置する。",
    "参照画像のすべての要素を正面から説明するように横並びで見せない。",
    "奥行き順、重なり、接地影、床・地面・壁・水平線・垂直線の向きを統一する。",
    ...relationLines
  ], "\n");
}

function getSpatialRelationLockEnglish(data) {
  const relation = String(data.get("spatialRelation") || "").trim();
  if (!shouldUseSpatialRelationLock(data)) return "";

  const relationLines = relation
    ? [
      `Specified on-screen depth order: ${stripTrailingPunctuation(relation)}.`,
      "Prioritize this depth order, and place other background elements at the edges, to the side, or farther back in a restrained way."
    ]
    : [];

  return compactJoin([
    "Spatial relationship and depth-order lock:",
    "The reference image does not have to be a room. Treat it as a spatial-layout reference for indoor spaces, outdoor places, shops, streets, nature, vehicles, buildings, tabletops, or any other environment.",
    "Do not simply line up the reference elements side by side. Convert them into foreground, midground, and background depth from the selected camera position.",
    "Organize what appears in front of the subject, beside the subject, behind the subject, and farther in the background.",
    "Behind the subject, place the background elements that would actually overlap from the camera's viewpoint.",
    "Do not show every reference element as a front-facing explanatory lineup.",
    "Keep the depth order, overlaps, contact shadows, floor or ground direction, walls, horizon lines, and vertical lines consistent.",
    ...relationLines
  ], "\n");
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

function getPersonMotionNote(value) {
  const notes = {
    "左右移動を横から見せる": [
      "左右方向の動きが分かるように、体の傾き、足運び、腕の振り、視線を明確に描く。",
      "Show sideways motion through the body lean, foot placement, arm swing, and gaze direction."
    ],
    "斜め奥へ移動する": [
      "斜め方向へ進む動きが分かるように、ポーズ、視線、手足の向きで奥行き感を出す。",
      "Show diagonal movement through the pose, gaze, hand direction, and foot direction."
    ],
    "手前から奥へ進む": [
      "手前から奥へ進む動きが分かるように、体の向き、足元、視線で進行方向を表現する。",
      "Show movement away from the viewer through body orientation, feet, and gaze direction."
    ],
    "奥から手前へ進む": [
      "手前へ向かってくる動きが分かるように、表情、手元、足元、体の重心を強調する。",
      "Show movement toward the viewer by emphasizing expression, hands, feet, and body weight."
    ],
    "背景を進行方向に流す": [
      "背景は描かず、ポーズ、髪や服の動き、効果線だけで進行方向を表現する。",
      "Do not draw background scenery; show the motion direction only through the pose, hair and clothing movement, and motion lines."
    ],
    "カメラが回り込む": [
      "人物の立体感が伝わるように、顔、肩、胴体、手足の向きに自然な回り込みを出す。",
      "Give the character dimensionality by showing a natural turn in the face, shoulders, torso, hands, and legs."
    ]
  };

  return notes[value] || ["", ""];
}

function getPersonDepthJapanese(value) {
  const map = {
    "背景をぼかす": "人物の輪郭と表情をくっきり見せ、背景は白地または単色のままにする",
    "背景まで描き込む": "人物の線、服、手元、表情を丁寧に描き込み、背景は描き込まない"
  };

  return map[value] || value;
}

function getPersonDepthEnglish(value) {
  const map = {
    "背景をぼかす": "crisp character focus with a plain white or simple solid-color background",
    "背景まで描き込む": "detailed character linework, clothing, hands, and expression, with no detailed background"
  };

  return map[value] || getOptionEnglish("depth", value);
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



function getGenerationMode(data) {
  return data.get("generationMode") || "personBackground";
}

function hasBackgroundContext(data) {
  return getGenerationMode(data) === "personBackground" && (hasReference(data, "backgroundReference") || Boolean(String(data.get("background") || "").trim()));
}

function isCloseOrUpperShot(shot) {
  return closeShotSet.has(shot) || upperShotSet.has(shot);
}

function isFullOrLongShot(shot) {
  return fullBodyShotSet.has(shot) || longShotSet.has(shot);
}

function getAspectCompatibilityStatus(data, aspectValue) {
  const generationMode = getGenerationMode(data);
  const shot = data.get("shot");

  if (generationMode === "background") {
    return backgroundRecommendedAspects.has(aspectValue) ? "recommended" : "caution";
  }

  if (isCloseOrUpperShot(shot)) {
    if (ultraWideAspectSet.has(aspectValue)) return "bad";
    return characterCloseRecommendedAspects.has(aspectValue) ? "recommended" : "caution";
  }

  if (partialBodyShotSet.has(shot) || fullBodyShotSet.has(shot)) {
    if (ultraWideAspectSet.has(aspectValue)) return "bad";
    return fullBodyRecommendedAspects.has(aspectValue) ? "recommended" : "caution";
  }

  if (longShotSet.has(shot)) {
    return wideAspectSet.has(aspectValue) || aspectValue === "4:3 標準横構図" ? "recommended" : "caution";
  }

  return "recommended";
}

function decorateAspectOptions(data) {
  if (!aspectSelect) return;
  Array.from(aspectSelect.options).forEach((option) => {
    const status = getAspectCompatibilityStatus(data, option.value);
    const suffix = status === "bad" ? " ✕非推奨" : status === "caution" ? " ⚠注意" : "";
    option.textContent = `${option.value}${suffix}`;
    option.disabled = false;
  });
}

function getEffectiveDirectionJapanese(data) {
  const cameraView = data.get("cameraView");
  const direction = data.get("direction");

  if (cameraView === "サイドビュー") {
    if (direction === "正面") return "体は横向き、顔だけ少しこちら向き";
    if (direction === "後ろ姿") return "体は横向き、背中側が少し見える向き";
    if (direction === "斜め後ろ") return "横向き寄りの斜め後ろ";
  }

  if (cameraView === "斜めサイドビュー" && direction === "正面") {
    return "体は斜め横向き、顔だけ少しこちら向き";
  }

  if ((cameraView === "背後から追う" || cameraView === "肩越し") && direction === "正面") {
    return "背中または肩越しを主に見せ、顔は横顔か一部だけ見える向き";
  }

  return direction;
}

function getEffectiveDirectionEnglish(data) {
  const cameraView = data.get("cameraView");
  const direction = data.get("direction");

  if (cameraView === "サイドビュー") {
    if (direction === "正面") return "side-facing body, with only the face turned slightly toward the viewer";
    if (direction === "後ろ姿") return "side-facing body with a slight view of the back";
    if (direction === "斜め後ろ") return "mostly side-facing with a slight three-quarter back angle";
  }

  if (cameraView === "斜めサイドビュー" && direction === "正面") {
    return "three-quarter side-facing body, with only the face turned slightly toward the viewer";
  }

  if ((cameraView === "背後から追う" || cameraView === "肩越し") && direction === "正面") {
    return "mainly a back or over-the-shoulder view, with only a profile or partial face visible";
  }

  return getOptionEnglish("direction", direction);
}

function getEffectiveCompositionJapanese(data) {
  const shot = data.get("shot");
  const screenComposition = data.get("screenComposition");
  if (isCloseOrUpperShot(shot) && screenComposition === "背景広め") {
    return "ショット優先、背景は見える範囲だけ";
  }
  if (isCloseOrUpperShot(shot) && screenComposition === "奥行き構図") {
    return "ショット優先、奥行きは控えめ";
  }
  return screenComposition;
}

function getEffectiveCompositionEnglish(data) {
  const shot = data.get("shot");
  const screenComposition = data.get("screenComposition");
  if (isCloseOrUpperShot(shot) && screenComposition === "背景広め") {
    return "shot-priority composition, with only the visible background area";
  }
  if (isCloseOrUpperShot(shot) && screenComposition === "奥行き構図") {
    return "shot-priority composition, with restrained depth";
  }
  return getOptionEnglish("screenComposition", screenComposition);
}

function getFramingSummaryJapanese(data) {
  return `${data.get("shot")}、被写体の向きは${getEffectiveDirectionJapanese(data)}、${data.get("angle")}、被写体は${data.get("subjectPlacement")}、画面全体は${getEffectiveCompositionJapanese(data)}。`;
}

function getFramingSummaryEnglish(data) {
  return `${getOptionEnglish("shot", data.get("shot"))}, subject direction: ${getEffectiveDirectionEnglish(data)}, ${getOptionEnglish("angle", data.get("angle"))}, subject placement: ${getOptionEnglish("subjectPlacement", data.get("subjectPlacement"))}, overall composition: ${getEffectiveCompositionEnglish(data)}.`;
}

function getShotLockJapanese(data) {
  const shot = data.get("shot");
  const aspect = getAspect();
  const hasBg = hasBackgroundContext(data);

  if (closeShotSet.has(shot)) {
    return compactJoin([
      `映す範囲は${shot}を最優先する。`,
      `アスペクト比は${aspect.value}だが、画面比率のためにカメラを引かない。`,
      "肩より下、胴体全体、腰、膝、足、足元、全身を描かない。",
      hasBg ? "背景参照があっても、背景は顔や手元の背後に見える一部だけにする。" : ""
    ], "\n");
  }

  if (upperShotSet.has(shot)) {
    return compactJoin([
      "映す範囲は上半身を最優先する。",
      `アスペクト比は${aspect.value}だが、横幅や背景を見せるために全身構図へ引かない。`,
      "膝、足、足元、全身を描かない。",
      "画面外に下半身が自然に続くように見せる。",
      hasBg ? "背景参照画像の全体を無理に入れず、上半身ショットの背後に見える範囲だけ描く。" : ""
    ], "\n");
  }

  if (partialBodyShotSet.has(shot)) {
    return compactJoin([
      "映す範囲は膝上を優先する。",
      `アスペクト比は${aspect.value}だが、足元まで入れるために勝手に全身へ広げない。`,
      "足、足元、靴底まで描かない。"
    ], "\n");
  }

  if (fullBodyShotSet.has(shot)) {
    return compactJoin([
      "映す範囲は全身を優先する。",
      "頭から足先まで入れるが、人物を縦に伸ばさず、余白を使って自然に収める。",
      squareAspectSet.has(aspect.value) || wideAspectSet.has(aspect.value) ? "横長または正方形でも、足先を切らず、背景を広く見せるために人物を小さくしすぎない。" : ""
    ], "\n");
  }

  return "";
}

function getShotLockEnglish(data) {
  const shot = data.get("shot");
  const aspect = getAspect();
  const hasBg = hasBackgroundContext(data);

  if (closeShotSet.has(shot)) {
    return compactJoin([
      `Prioritize the selected shot: ${getOptionEnglish("shot", shot)}.`,
      `Use the ${aspect.en}, but do not pull the camera back because of the aspect ratio.`,
      "Do not show the lower body, full torso, waist, knees, legs, feet, floor around the feet, or full body.",
      hasBg ? "Even with a background reference, show only the partial background visible behind the face or hands." : ""
    ], "\n");
  }

  if (upperShotSet.has(shot)) {
    return compactJoin([
      "Prioritize the upper-body shot.",
      `Use the ${aspect.en}, but do not widen the camera into a full-body composition to show more background.`,
      "Do not show knees, legs, feet, floor around the feet, or the full body.",
      "Let the lower body continue naturally outside the frame.",
      hasBg ? "Do not force the entire background reference into the frame; include only what naturally appears behind the upper-body shot." : ""
    ], "\n");
  }

  if (partialBodyShotSet.has(shot)) {
    return compactJoin([
      "Prioritize the knee-up shot.",
      `Use the ${aspect.en}, but do not expand it into a full-body shot just to include the feet.`,
      "Do not show the feet, floor around the feet, or shoe soles."
    ], "\n");
  }

  if (fullBodyShotSet.has(shot)) {
    return compactJoin([
      "Prioritize the full-body shot.",
      "Show the character from head to toe, but do not stretch the character vertically; use natural empty space if needed.",
      squareAspectSet.has(aspect.value) || wideAspectSet.has(aspect.value) ? "Even in a square or horizontal aspect ratio, do not cut off the feet or make the character too small just to show more background." : ""
    ], "\n");
  }

  return "";
}

function getOrientationLockJapanese(data) {
  const cameraView = data.get("cameraView");
  const direction = data.get("direction");
  const lines = [];

  if (cameraView === "サイドビュー" && direction === "正面") {
    lines.push("サイドビューと正面向きが矛盾するため、カメラビューを優先し、体は横向き、顔だけ少しこちら向きにする。");
  }
  if (cameraView === "斜めサイドビュー" && direction === "正面") {
    lines.push("斜めサイドビューでは、体は斜め横向き、顔だけ少しこちら向きにする。");
  }
  if ((cameraView === "背後から追う" || cameraView === "肩越し") && direction === "正面") {
    lines.push("背後・肩越しのカメラでは正面顔を大きく見せず、背中、肩越し、横顔、または顔の一部だけにする。");
  }

  return lines.length ? compactJoin(["【向き補正】", ...lines], "\n") : "";
}

function getOrientationLockEnglish(data) {
  const cameraView = data.get("cameraView");
  const direction = data.get("direction");
  const lines = [];

  if (cameraView === "サイドビュー" && direction === "正面") {
    lines.push("Because side view and front-facing direction conflict, prioritize the camera view: make the body side-facing and turn only the face slightly toward the viewer.");
  }
  if (cameraView === "斜めサイドビュー" && direction === "正面") {
    lines.push("For a three-quarter side view, use a three-quarter side-facing body and turn only the face slightly toward the viewer.");
  }
  if ((cameraView === "背後から追う" || cameraView === "肩越し") && direction === "正面") {
    lines.push("For a rear or over-the-shoulder camera, do not show a large front-facing face; show the back, shoulder view, profile, or only part of the face.");
  }

  return lines.length ? compactJoin(["Direction correction:", ...lines], "\n") : "";
}

function getAspectPriorityLockJapanese(data) {
  const aspect = getAspect();
  const shot = data.get("shot");
  const lines = [
    "【アスペクト比・ショット整合性】",
    "アスペクト比は画面の形を決める指定であり、映す範囲より優先しない。",
    `アスペクト比が${aspect.value}でも、映す範囲は${shot}を維持する。`,
    "背景や空間を多く見せるために、指定ショットを勝手に広げない。"
  ];

  if (hasFullBackgroundReference(data) && isCloseOrUpperShot(shot) && wideAspectSet.has(aspect.value)) {
    lines.push("横構図で背景全体参照がある場合でも、背景は画面内に自然に入る範囲だけにする。");
  }
  if (isCloseOrUpperShot(shot) && ultraWideAspectSet.has(aspect.value)) {
    lines.push("超ワイド比率でも、人物を小さくして全身化せず、横の余白や背景の一部で画面を構成する。");
  }
  if (isFullOrLongShot(shot) && (squareAspectSet.has(aspect.value) || wideAspectSet.has(aspect.value))) {
    lines.push("全身・遠景では、足先を切らず、人物を縮小しすぎず、余白を使って自然に収める。");
  }

  return compactJoin(lines, "\n");
}

function getAspectPriorityLockEnglish(data) {
  const aspect = getAspect();
  const shot = data.get("shot");
  const lines = [
    "Aspect-ratio and shot consistency:",
    "The aspect ratio defines the canvas shape; it must not override the selected shot size.",
    `Even with the ${aspect.en}, preserve the selected shot: ${getOptionEnglish("shot", shot)}.`,
    "Do not pull the camera back or widen the shot just to show more background or space."
  ];

  if (hasFullBackgroundReference(data) && isCloseOrUpperShot(shot) && wideAspectSet.has(aspect.value)) {
    lines.push("Even in a horizontal composition with a full-background reference, show only the background area that naturally fits within the selected shot.");
  }
  if (isCloseOrUpperShot(shot) && ultraWideAspectSet.has(aspect.value)) {
    lines.push("Even in an ultra-wide aspect ratio, do not make the character small or turn the image into a full-body shot; use side space or partial background instead.");
  }
  if (isFullOrLongShot(shot) && (squareAspectSet.has(aspect.value) || wideAspectSet.has(aspect.value))) {
    lines.push("For full-body or long shots, do not cut off the feet or shrink the character too much; use natural empty space if needed.");
  }

  return compactJoin(lines, "\n");
}

function getPoseAngleWarning(data) {
  const subject = String(data.get("subject") || "");
  const angle = data.get("angle");
  const hasDeskContact = /(机|デスク|テーブル|カウンター|作業台|つっぷ|突っ伏|うつ伏せ|寝|倒れ|座|座っ)/.test(subject);
  if (hasDeskContact && (angle === "見上げ" || angle === "あおり" || angle === "真上")) {
    return true;
  }
  return false;
}

function getConsistencyLockJapanese(data) {
  const generationMode = getGenerationMode(data);
  if (generationMode === "background") return "";

  return compactJoin([
    "【矛盾回避・優先順位】",
    "指定が矛盾する場合は、映す範囲（ショット）→表情・動作→カメラビュー→上下の角度→体の向き→顔・視線の向き→背景の見せ方、の順で優先する。",
    "下位の指定は、上位の指定を壊さない範囲で自然に補正する。",
    getAspectPriorityLockJapanese(data),
    getShotLockJapanese(data),
    getOrientationLockJapanese(data),
    getPoseAngleWarning(data) ? "【角度注意】机・接触面・寝姿勢に関わる動作では、見上げ・あおり・真上視点で手元や顔の接触関係が崩れやすい。指定角度を使う場合も、動作と接触面の自然さを優先する。" : ""
  ], "\n");
}

function getConsistencyLockEnglish(data) {
  const generationMode = getGenerationMode(data);
  if (generationMode === "background") return "";

  return compactJoin([
    "Conflict-avoidance priority:",
    "If any instructions conflict, prioritize them in this order: shot size, expression/action, camera view, vertical camera angle, body direction, face/gaze direction, then background visibility.",
    "Lower-priority instructions should be adjusted naturally without breaking higher-priority instructions.",
    getAspectPriorityLockEnglish(data),
    getShotLockEnglish(data),
    getOrientationLockEnglish(data),
    getPoseAngleWarning(data) ? "Angle caution: for actions involving desks, contact surfaces, lying down, or leaning onto a surface, low-angle, dramatic low-angle, or top-down views can break the face, hands, and contact relationship. Even if the selected angle is used, prioritize a natural action and contact-surface relationship." : ""
  ], "\n");
}

function collectConsistencyItems(data) {
  const items = [];
  const generationMode = getGenerationMode(data);
  const shot = data.get("shot");
  const aspect = getAspect();
  const direction = data.get("direction");
  const cameraView = data.get("cameraView");
  const screenComposition = data.get("screenComposition");
  const aspectStatus = getAspectCompatibilityStatus(data, aspect.value);

  if (generationMode !== "background") {
    if (aspectStatus === "bad") {
      items.push({ level: "bad", text: `${shot} × ${aspect.value}：非推奨。出力ではショットを優先します。` });
    } else if (aspectStatus === "caution") {
      items.push({ level: "warn", text: `${shot} × ${aspect.value}：注意。画角が広がりやすいため、ショット優先で補正します。` });
    }

    if (hasFullBackgroundReference(data) && isCloseOrUpperShot(shot)) {
      items.push({ level: "warn", text: `${shot}＋背景全体参照：全体を入れず、画面に入る範囲だけ使います。` });
    }

    if (hasReference(data, "backgroundReference") && getBackgroundReferenceUsage(data) === "配置図として参照" && isCloseOrUpperShot(shot)) {
      items.push({ level: "warn", text: `${shot}＋配置図参照：図面の俯瞰ではなく、選択したカメラビューに変換します。` });
    }

    if ((cameraView === "サイドビュー" || cameraView === "斜めサイドビュー") && direction === "正面") {
      items.push({ level: "warn", text: `${cameraView}＋正面向き：体は横向き寄り、顔だけ少しこちら向きにします。` });
    }

    if ((cameraView === "背後から追う" || cameraView === "肩越し") && direction === "正面") {
      items.push({ level: "warn", text: `${cameraView}＋正面向き：背中・肩越し・横顔寄りにします。` });
    }

    if (isCloseOrUpperShot(shot) && (screenComposition === "背景広め" || screenComposition === "奥行き構図")) {
      items.push({ level: "warn", text: `${shot}＋${screenComposition}：カメラが引きやすいため、人物の画角を優先します。` });
    }

    if (getPoseAngleWarning(data)) {
      items.push({ level: "warn", text: "机・接触面＋見上げ/あおり/真上：接触が崩れやすいため、動作の自然さを優先します。" });
    }
  } else if (aspectStatus === "caution") {
    items.push({ level: "warn", text: `${aspect.value}：背景専用としては縦寄りです。横背景なら 16:9、4:3、3:2 が安定します。` });
  }

  return items;
}

function updateAspectDescriptionAndRestrictions() {
  const data = new FormData(form);
  decorateAspectOptions(data);
  const aspect = getAspect();
  const status = getAspectCompatibilityStatus(data, aspect.value);
  const statusText = status === "bad" ? "非推奨：" : status === "caution" ? "注意：" : "";
  const compatibilityText = status === "bad"
    ? "この組み合わせは画角が崩れやすいため、出力プロンプトでショット優先に補正します。"
    : status === "caution"
      ? "この組み合わせは少し崩れやすいため、必要な補正文を自動で追加します。"
      : "現在のショットと相性が良い比率です。";
  aspectDescription.textContent = `${statusText}${aspect.description} ${compatibilityText}`;
}

function updateConsistencyUi() {
  if (!consistencyCard || !consistencySummary || !consistencyList) return;
  const data = new FormData(form);
  const items = collectConsistencyItems(data);
  const hasItems = items.length > 0;

  consistencyCard.hidden = false;
  consistencyList.innerHTML = "";

  if (!hasItems) {
    consistencySummary.textContent = "現在の組み合わせに大きな矛盾はありません。";
    consistencySummary.className = "hint compatibility-status-ok";
    return;
  }

  const hasBad = items.some((item) => item.level === "bad");
  consistencySummary.textContent = hasBad
    ? "非推奨があります。出力時はショット・向きを優先します。"
    : "注意があります。出力時に自動補正します。";
  consistencySummary.className = `hint ${hasBad ? "compatibility-status-bad" : "compatibility-status-warn"}`;

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item.text;
    li.className = item.level === "bad" ? "compatibility-status-bad" : "compatibility-status-warn";
    consistencyList.appendChild(li);
  });
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

function getBackgroundReferenceUsage(data) {
  if (!hasReference(data, "backgroundReference")) return "";
  return data.get("backgroundReferenceUsage") || "画面内に入る範囲だけ参照";
}

function hasFullBackgroundReference(data) {
  return hasReference(data, "backgroundReference") && getBackgroundReferenceUsage(data) === "背景全体を参照";
}

function hasLimitedBackgroundReference(data) {
  const usage = getBackgroundReferenceUsage(data);
  return Boolean(usage) && usage !== "背景全体を参照";
}

function shouldUseSpatialRelationLock(data) {
  const relation = String(data.get("spatialRelation") || "").trim();
  const usage = getBackgroundReferenceUsage(data);
  return Boolean(relation) || ["背景全体を参照", "画面内に入る範囲だけ参照", "配置図として参照", "空間の前後関係だけ参照"].includes(usage);
}

function getBackgroundReferenceUsageNoteJapanese(data) {
  if (!hasReference(data, "backgroundReference")) return "";
  const usage = getBackgroundReferenceUsage(data);
  const notes = {
    "背景全体を参照": [
      "【参照画像の使い方】",
      "添付画像は、場所・背景・空間構成の参照として使う。",
      "背景全体の構造、家具・設備・自然物・建物・小物・光・雰囲気を参考にする。",
      "ただし、指定されたショット、カメラビュー、アスペクト比を優先する。"
    ],
    "画面内に入る範囲だけ参照": [
      "【参照画像の使い方】",
      "添付画像は、最終画面に自然に入る範囲だけ参照する。",
      "指定ショットを優先し、背景全体を入れるためにカメラを引かない。",
      "画面外にある参照要素は、無理に描かない。"
    ],
    "接触家具・作業面だけ参照": [
      "【参照画像の使い方】",
      "添付画像は背景全体ではなく、机・椅子・テーブル・カウンター・作業台・PC・マグカップ・本・ライトなど、被写体が接する家具・作業面・小物の配置、サイズ感、接触面の高さだけを参照する。",
      "部屋全体や空間全体を画面に入れない。",
      "指定ショットで見える範囲だけ使い、背景を見せるためにカメラを引かない。"
    ],
    "小物・道具だけ参照": [
      "【参照画像の使い方】",
      "添付画像は、小物・道具・持ち物の形、サイズ感、配置だけを参照する。",
      "背景全体、部屋構造、空間構成は再現しない。",
      "小物や道具は、被写体の手元と指定ショットに自然に入る範囲だけ描く。"
    ],
    "配置図として参照": [
      "【参照画像の使い方】",
      "添付画像は配置図として使い、家具・物・場所要素の位置関係、距離感、スケール感だけを参照する。",
      "最終画像では、添付画像の俯瞰、アイソメ、真上視点、図面風のカメラ角度を再現しない。",
      "配置情報を、選択したカメラビューとショットに合う自然な構図へ変換する。"
    ],
    "空間の前後関係だけ参照": [
      "【参照画像の使い方】",
      "添付画像は、空間の前後関係だけを参照する。",
      "前景・中景・背景、被写体の手前・横・背後・奥にある要素を整理して使う。",
      "構図、画角、カメラビューは、Scene Promptで選択した設定を優先する。"
    ]
  };
  return compactJoin(notes[usage] || notes["画面内に入る範囲だけ参照"], "\n");
}

function getBackgroundReferenceUsageNoteEnglish(data) {
  if (!hasReference(data, "backgroundReference")) return "";
  const usage = getBackgroundReferenceUsage(data);
  const notes = {
    "背景全体を参照": [
      "Reference-image usage:",
      "Use the attached image as a reference for the location, background, and spatial structure.",
      "Refer to the overall structure, furniture, fixtures, natural objects, buildings, props, lighting, and atmosphere.",
      "However, prioritize the selected shot size, camera view, and aspect ratio."
    ],
    "画面内に入る範囲だけ参照": [
      "Reference-image usage:",
      "Use only the part of the reference image that naturally fits within the final frame.",
      "Prioritize the selected shot; do not pull the camera back just to include the entire background.",
      "Do not force reference elements that would be outside the frame into the image."
    ],
    "接触家具・作業面だけ参照": [
      "Reference-image usage:",
      "Do not use the attached image as a full-background reference. Use only contact furniture, work surfaces, and nearby props such as the desk, chair, table, counter, worktop, laptop, mug, book, and lamp for placement, scale, and contact-surface height.",
      "Do not include the whole room or the whole environment in the frame.",
      "Use only what fits naturally within the selected shot, and do not pull the camera back to show more background."
    ],
    "小物・道具だけ参照": [
      "Reference-image usage:",
      "Use the attached image only for props, tools, handheld objects, their shapes, sizes, and placement.",
      "Do not recreate the full background, room structure, or spatial layout.",
      "Draw props and tools only where they naturally fit near the subject's hands and within the selected shot."
    ],
    "配置図として参照": [
      "Reference-image usage:",
      "Use the attached image as a layout diagram: refer only to the positional relationships, distances, and scale relationships of furniture, objects, and place elements.",
      "Do not recreate the reference image's bird's-eye, isometric, top-down, or diagram-like camera angle in the final image.",
      "Convert the layout information into a natural composition that matches the selected camera view and shot."
    ],
    "空間の前後関係だけ参照": [
      "Reference-image usage:",
      "Use the attached image only for spatial depth order.",
      "Organize which elements belong to the foreground, midground, background, in front of the subject, beside the subject, behind the subject, and farther back.",
      "Prioritize the Scene Prompt settings for composition, framing, and camera view."
    ]
  };
  return compactJoin(notes[usage] || notes["画面内に入る範囲だけ参照"], "\n");
}

function getReferenceNotes(data) {
  const hasSubjectReference = hasReference(data, "subjectReference");
  const hasBackgroundReference = hasReference(data, "backgroundReference");

  return {
    jp: compactJoin([
      hasSubjectReference ? "被写体は添付画像を参照する。" : "",
      hasBackgroundReference ? "添付画像を参照する。参照画像の具体的な使い方は、参照画像の使い方指定に従う。" : ""
    ], "\n"),
    en: compactJoin([
      hasSubjectReference ? "Use the attached subject reference image." : "",
      hasBackgroundReference ? "Use the attached reference image. Follow the selected reference-image usage instructions for how to use it." : ""
    ], "\n")
  };
}

function getStyleLockJapanese(data) {
  const hasSubjectReference = hasReference(data, "subjectReference");
  const hasBackgroundReference = hasReference(data, "backgroundReference");
  if (!hasSubjectReference) return "";

  const styleLock = [
    "【画風固定】",
    "添付の被写体参照画像は、人物の体型だけでなく、画面全体の画風の最優先基準として使う。",
    "人物の顔立ち、目の描き方、髪の描き方、線の太さ、線の柔らかさ、黒の置き方、グレーのトーン量、陰影、白地の残し方を参照画像に合わせる。",
    "背景だけ写実的・細密・高密度にしない。",
    "背景要素・環境要素・家具・床・壁・道具・自然物・建物・設備・周辺物も、被写体参照画像と同じ簡略化レベル、線画密度、トーン量にする。"
  ].join("\n");
  const backgroundPriority = hasBackgroundReference
    ? [
      "背景参照画像の使い方は、参照画像の使い方指定に従う。",
      "ただし、画風、線のタッチ、トーン量、簡略化レベルは被写体参照画像を最優先で合わせる。"
    ].join("\n")
    : "";

  return compactJoin([styleLock, backgroundPriority], "\n");
}

function getStyleLockEnglish(data) {
  const hasSubjectReference = hasReference(data, "subjectReference");
  const hasBackgroundReference = hasReference(data, "backgroundReference");
  if (!hasSubjectReference) return "";

  const styleLock = [
    "Style lock:",
    "Use the attached subject reference not only for the character design and body proportions, but also as the top-priority style reference for the entire image.",
    "Match the face design, eye style, hair rendering, line thickness, line softness, black placement, gray tone amount, shading style, and white-space balance to the subject reference.",
    "Do not make the background realistic, highly detailed, or visually denser than the character.",
    "Keep background elements, environmental elements, furniture, floors, walls, tools, natural objects, buildings, fixtures, and surrounding objects at the same simplification level, line density, and tone density as the subject reference."
  ].join("\n");
  const backgroundPriority = hasBackgroundReference
    ? [
      "Use the background reference according to the selected reference-image usage instructions.",
      "However, match the overall art style, linework, tone density, and simplification level to the subject reference as the top priority."
    ].join("\n")
    : "";

  return compactJoin([styleLock, backgroundPriority], "\n");
}

function getBodyProportionLockJapanese(data, includeEnvironment = true) {
  const hasRef = hasReference(data, "subjectReference");
  const isDeformed = deformedScalePresets.has(data.get("scalePreset"));
  if (!hasRef && !isDeformed) return "";

  const sharedLines = [
    "【胴長防止・体型固定】",
    "全身でも、添付参照画像の頭身と体型を最優先で維持する。",
    "頭を大きく、首を短く、肩から腰までの胴体を短く描く。",
    "首下から腰までを縦に伸ばさない。",
    "腰位置を低くしない。",
    "服装が変わっても、体の内部構造として肩から腰までを短く保つ。",
    "上半身の服や衣服の胴部分を縦に伸ばして、胴長に見せない。"
  ];
  const environmentLines = includeEnvironment
    ? [
      "胴体を伸ばして接触面や背景要素に合わせない。",
      "必要な場合は、腕・肩・手元・接触面・小物側を調整して動作を成立させる。"
    ]
    : [];

  return compactJoin([...sharedLines, ...environmentLines], "\n");
}

function getBodyProportionLockEnglish(data, includeEnvironment = true) {
  const hasRef = hasReference(data, "subjectReference");
  const isDeformed = deformedScalePresets.has(data.get("scalePreset"));
  if (!hasRef && !isDeformed) return "";

  const sharedLines = [
    "Anti-long-torso body lock:",
    "The character has a large head (approximately 1/5 of total body height), a short neck, and a short torso from shoulders to waist.",
    "Even in a full-body composition, preserve the head-to-body ratio and body proportions.",
    "Keep the head large, the neck short, and the torso from shoulders to waist short.",
    "Do not vertically stretch the neck-to-waist area.",
    "Do not lower the waist position.",
    "Regardless of outfit, keep the internal shoulder-to-waist structure short.",
    "Do not stretch upper-body clothing so the torso looks long."
  ];
  const environmentLines = includeEnvironment
    ? [
      "Do not lengthen the torso to fit contact surfaces or background elements.",
      "Adjust arms, shoulders, hands, contact surfaces, and props instead."
    ]
    : [];

  return compactJoin([...sharedLines, ...environmentLines], "\n");
}

function shouldUseDeformedComposition(data, includeAutoSupplement = false) {
  const isSelected = data.get("screenComposition") === "デフォルメキャラ優先";
  if (isSelected) return true;
  return includeAutoSupplement && hasReference(data, "subjectReference") && deformedScalePresets.has(data.get("scalePreset"));
}

function getDeformedCompositionJapanese(data, includeEnvironment = true, includeAutoSupplement = false) {
  if (!shouldUseDeformedComposition(data, includeAutoSupplement)) return "";

  const sharedLines = [
    "【デフォルメキャラ優先構図】",
    "デフォルメキャラの頭身と体型を最優先にした構図にする。",
    "人物の頭を大きく、首を短く、肩から腰までを短く保つ。",
    "全身を描く場合でも、人物を縦に引き伸ばして画面に収めない。",
    "画面内に余白を残してよいので、人物の体型比率を優先する。"
  ];
  const environmentLines = includeEnvironment
    ? [
      "背景、接触面、作業面、小物、周辺物は、人物の体型を崩さない位置と大きさに配置する。",
      "机、台、カウンター、床、地面、壁、段差、手すり、持ち物などは、固定された人物のポーズに合わせて配置する。",
      "余白を使ってよいが、背景を完全に省略しすぎない。",
      "人物の体型比率を優先しつつ、場所が分かる最低限の背景要素は残す。",
      "背景の情報量や奥行きより、頭・首・肩・腰の比率が読みやすい構図を優先する。",
      "強い遠近感や深い背景パースで人物を縦に伸ばさない。"
    ]
    : [];

  return compactJoin([...sharedLines, ...environmentLines], "\n");
}

function getDeformedCompositionEnglish(data, includeEnvironment = true, includeAutoSupplement = false) {
  if (!shouldUseDeformedComposition(data, includeAutoSupplement)) return "";

  const sharedLines = [
    "Composition prioritized for deformed character proportions:",
    "Build the composition around the deformed character's head-to-body ratio and body proportions as the top priority.",
    "Keep the head large, neck short, and torso from shoulders to waist short.",
    "Even in a full-body composition, do not vertically stretch the character to fill the frame.",
    "Leave empty space if needed, and prioritize preserving the character's body proportions."
  ];
  const environmentLines = includeEnvironment
    ? [
      "Place the background, contact surfaces, work surfaces, props, and surrounding objects around the character without changing the character's proportions.",
      "Desks, tables, counters, floors, ground, walls, steps, railings, handheld objects, and touched objects should be positioned to match the fixed character pose.",
      "Leave empty space if needed, but do not remove the background too much.",
      "Prioritize the character's proportions while keeping enough background elements to understand the location.",
      "Prioritize a readable head, neck, shoulder, and waist relationship over background density or deep perspective.",
      "Do not use strong perspective or deep background depth to vertically stretch the character."
    ]
    : [];

  return compactJoin([...sharedLines, ...environmentLines], "\n");
}

function shouldUseContactSurfaceReplacement(data) {
  if (!hasReference(data, "subjectReference")) return false;
  const scalePreset = data.get("scalePreset");
  const workSurfaceHeight = data.get("workSurfaceHeight");
  return deformedScalePresets.has(scalePreset) || isOptionalChoice(workSurfaceHeight);
}

function getContactSurfaceReplacementJapanese(data) {
  if (!shouldUseContactSurfaceReplacement(data)) return "";

  return [
    "【接触面の高さ調整】",
    "机、台、作業台、カウンター、テーブル、床、地面、壁、段差、手すり、道具、持ち物など、主人公が触れるものは、固定された主人公の体型とポーズに合う接触面として描く。",
    "作業面の天板や接触面は、主人公が胴体や腕を伸ばさず自然に扱える高さにする。",
    "立ち作業では、作業面が低すぎたり高すぎたりしないようにし、手元の動作が自然に見える高さにする。",
    "標準成人サイズの高い設備を基準にしない。",
    "接触面が合わない場合は、人物ではなく接触面・道具・小物・周辺物の高さ、位置、大きさを調整する。"
  ].join("\n");
}

function getContactSurfaceReplacementEnglish(data) {
  if (!shouldUseContactSurfaceReplacement(data)) return "";

  return [
    "Contact surface height adjustment:",
    "Draw desks, tables, counters, platforms, floors, ground, walls, steps, railings, tools, handheld objects, and touched objects as contact surfaces adjusted to the fixed character body and pose.",
    "Set work surfaces and contact surfaces to a height the character can use naturally without stretching the torso or arms.",
    "For standing actions, avoid surfaces that are too low or too high, and place the work surface at a natural height for the hand action.",
    "Do not use standard adult-sized high fixtures as the scale reference.",
    "If the contact surface does not fit, adjust the height, position, or size of the contact surface, tools, props, or surrounding objects instead of deforming the character."
  ].join("\n");
}

function shouldUseShallowDepthForDeformedCharacter(data) {
  return hasReference(data, "subjectReference") && deformedScalePresets.has(data.get("scalePreset"));
}

function getEffectiveDepth(data) {
  const depth = data.get("depth");
  if (shouldUseShallowDepthForDeformedCharacter(data) && depth === "自然な奥行き") {
    return "デフォルメ向け浅い奥行き";
  }
  return depth;
}

function getDepthInstructionJapanese(data) {
  const depth = getEffectiveDepth(data);
  if (depth !== "デフォルメ向け浅い奥行き") return "";

  return [
    "【デフォルメ向け浅い奥行き】",
    "デフォルメキャラに合わせた浅い奥行きで描く。",
    "背景は深いリアル空間にせず、手前・人物・背面の関係が分かる程度に簡略化する。",
    "床、壁、机、台、カウンター、棚、背景要素に強い遠近感をつけない。",
    "強い遠近感、奥へ大きく伸びる床板、長い作業台、深い室内パースは強調しない。",
    "接地感と場所の分かりやすさは保つ。",
    "人物の体型を背景パースに合わせて縦に伸ばさない。"
  ].join("\n");
}

function getDepthInstructionEnglish(data) {
  const depth = getEffectiveDepth(data);
  if (depth !== "デフォルメ向け浅い奥行き") return "";

  return [
    "Shallow depth for deformed characters:",
    "Use shallow depth adjusted to the deformed character.",
    "Do not create a deep realistic space.",
    "Simplify the depth enough to keep the foreground, character, and rear background readable.",
    "Do not apply strong perspective to the floor, walls, desks, tables, counters, shelves, or background elements.",
    "Do not emphasize strong perspective, long floorboards, long work surfaces, or deep indoor perspective.",
    "Preserve grounding and location readability.",
    "Do not vertically stretch the character's body to fit the background perspective."
  ].join("\n");
}

function getBackgroundDetailBalanceJapanese(data) {
  if (!shouldUseShallowDepthForDeformedCharacter(data)) return "";

  return [
    "【背景情報量】",
    "背景は白地を残しつつ、場所が分かる程度の家具・設備・壁・棚・小物を描く。",
    "背景を完全に省略しすぎない。",
    "背景の描き込みは控えめにするが、場所の構造が分かる情報量は残す。",
    "背景は人物より目立たせない。",
    "木目、床板、壁、棚、小物の質感は簡略化し、細密に描き込みすぎない。"
  ].join("\n");
}

function getBackgroundDetailBalanceEnglish(data) {
  if (!shouldUseShallowDepthForDeformedCharacter(data)) return "";

  return [
    "Background detail balance:",
    "Keep some white space, but include enough furniture, fixtures, walls, shelves, and props to make the location readable.",
    "Do not over-simplify the background into an almost empty space.",
    "Keep the background detail restrained, but preserve enough structure to understand the setting.",
    "Do not let the background overpower the character.",
    "Simplify textures such as wood grain, floorboards, walls, shelves, and props instead of rendering them densely."
  ].join("\n");
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
  const jpReferenceUsageNote = getBackgroundReferenceUsageNoteJapanese(data);
  const enReferenceUsageNote = getBackgroundReferenceUsageNoteEnglish(data);
  const [jpMotionComposition, enMotionComposition] = getBackgroundMotionComposition(motionBackground);

  const jpReference = hasBackgroundReference
    ? compactJoin([
      "添付画像は場所・背景・空間構成だけの参照として使う。",
      "参照画像は部屋に限らず、屋外、店内、街、自然、乗り物、建物、机上などの空間構成として扱う。",
      "添付画像内に人物やキャラクターが写っていても参照せず、生成にも含めない。",
      "添付画像と同じカメラアングルや同じ構図は避ける。",
      "同じ場所を別視点から見た背景として、家具、設備、自然物、建物、地面、部屋構造、空間構造、光、色味、雰囲気を参考にする。",
      "参照要素をただ横に並べず、選択したカメラ位置から見た前景・中景・背景の奥行きに変換する。",
      "新しい視点から環境を生成し、添付画像と同じ視点は使わない。"
    ], "\n")
    : "人物なしの背景専用シーンを生成する。";
  const jpLocation = background || "指定された場所・背景";
  const jpDetail = backgroundDetail ? `背景の詳細: ${backgroundDetail}。` : "";
  const jpCameraView = getOptionalJapanese(cameraView) ? `カメラビューは${cameraView}。` : "";
  const jpViewpoint = `別アングルは${alternateViewpoint}。`;

  jpPrompt.value = compactJoin([
    jpReference,
    jpReferenceUsageNote,
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
      "Use the attached image as a reference for the location, background, and spatial layout only.",
      "The reference does not have to be a room. Treat it as a spatial-layout reference for indoor spaces, outdoor places, shops, streets, nature, vehicles, buildings, tabletops, or any other environment.",
      "Refer to the environment, spatial structure, object placement, fixtures, furniture, natural elements, buildings, lighting, colors, and atmosphere.",
      "Do not reference or include any people or characters from the attached image.",
      "Do not include any people or characters.",
      "Generate the same environment from a different angle than the attached image.",
      "Avoid recreating the exact same camera angle or composition as the reference image.",
      "Convert reference elements into foreground, midground, and background depth from the selected camera position instead of lining them up side by side.",
      "Generate the environment from a new viewpoint.",
      "Do not use the same viewpoint as the attached image.",
      "Focus only on the background, environment, space, layout, spatial relationships, lighting, and atmosphere."
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
    enReferenceUsageNote,
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
  const generationMode = data.get("generationMode");

  if (generationMode === "background") {
    getBackgroundOnlyPrompt(data);
    return;
  }

  if (generationMode === "person") {
    getPersonOnlyPrompt(data);
    return;
  }

  getPersonBackgroundPrompt(data);
}

function getPersonBackgroundPrompt(data) {
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
  const scalePreset = data.get("scalePreset");
  const workSurfaceHeight = data.get("workSurfaceHeight");
  const propScale = data.get("propScale");
  const unwantedFurniture = data.get("unwantedFurniture");
  const backgroundStructureScale = data.get("backgroundStructureScale");
  const scaleData = {
    scalePreset,
    workSurfaceHeight,
    propScale,
    unwantedFurniture,
    backgroundStructureScale
  };

  const jpSubject = subjectPhrase || "魅力的な被写体";
  const jpAction = subjectPhrase
    ? `最重要の表情・動作指定: ${subjectPhrase}。この表情と動作を必ず画面の主役として描く。`
    : "";
  const jpPriority = "最優先: 口の形、目、眉、姿勢、視線、両手の位置、手元の動作を大きく明確に描く。叫び、セリフ、感情語がある場合は、口を大きく開けた表情や短い吹き出しで分かるように表現する。";
  const jpSceneIntegration = shouldUseShallowDepthForDeformedCharacter(data)
    ? "背景は場所の構造が分かる程度に簡略化して描く。接地感は保つが、リアルな深い奥行きや強いパースは避ける。背景の床・壁・棚・接触面は、デフォルメキャラの体型に合う浅い空間として描く。"
    : "背景を単なる模様にせず、場所の構造が分かるように描く。背景と被写体を同じカメラ位置、同じアイレベル、同じ光源で統一し、接地影で浮いて見えないようにする。";
  const jpStylizedIntegration = "人物と背景は同じ空間にあるように接地させる。ただし、人物の体型や画風を背景に合わせて変形しない。";
  const jpScaleLock = compactJoin([
    "【人物固定・環境側調整】",
    "人物の体型を正解として固定する。",
    "人物を背景や接触面に合わせて伸ばさない。",
    "背景要素、接触面、作業面、小物、周辺物の側を、人物の体型と現在のポーズに合わせる。"
  ], "\n");
  const jpDetailedScale = getDetailedScaleJapanese(scaleData);
  const jpContactSurfaceReplacement = getContactSurfaceReplacementJapanese(data);
  const jpDepthInstruction = getDepthInstructionJapanese(data);
  const jpBackgroundDetailBalance = getBackgroundDetailBalanceJapanese(data);
  const jpCameraView = getOptionalJapanese(cameraView) ? `カメラビューは${cameraView}。` : "";
  const [jpMotionBackground, enMotionBackground] = getMotionBackgroundNote(motionBackground);
  const jpEnvironment = getBackgroundEnvironmentJapanese(timeOfDay, weatherLight, atmosphere);
  const effectiveDepth = getEffectiveDepth(data);
  const jpEffectSentence = effect === "なし"
    ? `${effectiveDepth}で、漫画演出は控えめにする。`
    : `${effectiveDepth}で、${effect}を使った漫画演出を加える。`;
  const referenceNotes = getReferenceNotes(data);
  const jpReferenceUsageNote = getBackgroundReferenceUsageNoteJapanese(data);
  const enReferenceUsageNote = getBackgroundReferenceUsageNoteEnglish(data);
  const jpStyleLock = getStyleLockJapanese(data);
  const enStyleLock = getStyleLockEnglish(data);
  const jpBodyProportionLock = getBodyProportionLockJapanese(data);
  const enBodyProportionLock = getBodyProportionLockEnglish(data);
  const jpSpatialRelationLock = getSpatialRelationLockJapanese(data);
  const enSpatialRelationLock = getSpatialRelationLockEnglish(data);
  const jpDeformedComposition = getDeformedCompositionJapanese(data, true, true);
  const enDeformedComposition = getDeformedCompositionEnglish(data, true, true);
  const jpConsistencyLock = getConsistencyLockJapanese(data);
  const enConsistencyLock = getConsistencyLockEnglish(data);
  const jpSceneSubject = subjectPhrase ? `${subjectPhrase}シーン` : jpSubject;
  const jpSceneSentence = background
    ? `${background}を舞台に、${jpSceneSubject}を描いた漫画調のワンシーン画像。`
    : `${jpSceneSubject}を描いた漫画調のワンシーン画像。`;

  jpPrompt.value = compactJoin([
    referenceNotes.jp,
    jpReferenceUsageNote,
    jpStyleLock,
    jpBodyProportionLock,
    jpDeformedComposition,
    jpAction,
    jpPriority,
    jpSceneSentence,
    jpSceneIntegration,
    jpStylizedIntegration,
    jpSpatialRelationLock,
    jpConsistencyLock,
    jpContactSurfaceReplacement,
    jpScaleLock,
    jpDetailedScale,
    jpDepthInstruction,
    jpBackgroundDetailBalance,
    jpCameraView,
    jpMotionBackground,
    jpEnvironment,
    `アスペクト比は${aspect.value}。`,
    getFramingSummaryJapanese(data),
    jpEffectSentence,
    "ショットの種類にかかわらず、胴体を縦に伸ばして画面に収めない。",
    "自然な日本の漫画らしい線、読みやすいシルエット、表情と空気感が伝わる仕上がり。"
  ], "\n");

  const enSubject = translateFreeText(subjectPhrase, preserveOriginalText(subjectPhrase, "the subject and action described in Japanese")) || "an appealing subject";
  const enLocation = background ? `set in ${translateFreeText(background, preserveOriginalText(background, "the location/background described in Japanese"))}` : "";
  const enEffect = effect === "なし" ? "with subtle manga presentation and no special manga effects" : `with ${getOptionEnglish("effect", effect)}`;
  const enAction = subjectPhrase
    ? "Most important action and expression: depict the specified subject/action as the main focus of the image."
    : "";
  const enPriority = "Top priority: clearly show the mouth shape, eyes, eyebrows, pose, gaze, both hand positions, and hand/action details. If the input includes shouting, dialogue, or an emotion word, express it with a wide-open mouth and, if useful, a short speech bubble.";
  const enSceneIntegration = shouldUseShallowDepthForDeformedCharacter(data)
    ? "Keep the location structure readable but simplified. Preserve grounding, but avoid deep realistic perspective and strong spatial depth. Draw floors, walls, shelves, and contact surfaces as a shallow space scaled to the deformed character."
    : "Make the location structure readable. Integrate the subject and background with the same camera position, eye level, and light direction, and use contact shadows so the subject does not look floating.";
  const enStylizedIntegration = "Ground the character and background in the same space, but do not deform the character's proportions or style to match the background.";
  const enScaleAdaptation = compactJoin([
    "Character-fixed, environment-adjusted scale:",
    "Treat the character's proportions as the fixed correct reference.",
    "Do not stretch the character to fit the background or contact surfaces.",
    "Adjust the background elements, contact surfaces, work surfaces, props, and surrounding objects to the character's body and pose."
  ], "\n");
  const enDetailedScale = getDetailedScaleEnglish(scaleData);
  const enContactSurfaceReplacement = getContactSurfaceReplacementEnglish(data);
  const enDepthInstruction = getDepthInstructionEnglish(data);
  const enBackgroundDetailBalance = getBackgroundDetailBalanceEnglish(data);
  const enCameraView = getOptionEnglish("cameraView", cameraView) ? `Camera view: ${getOptionEnglish("cameraView", cameraView)}.` : "";
  const enEnvironment = getBackgroundEnvironmentEnglish(timeOfDay, weatherLight, atmosphere);

  enPrompt.value = compactJoin([
    referenceNotes.en,
    enReferenceUsageNote,
    enStyleLock,
    enBodyProportionLock,
    enDeformedComposition,
    enAction,
    enPriority,
    `A manga-style single-scene image of ${enSubject}${enLocation ? `, ${enLocation}` : ""}.`,
    enSceneIntegration,
    enStylizedIntegration,
    enSpatialRelationLock,
    enConsistencyLock,
    enContactSurfaceReplacement,
    enScaleAdaptation,
    enDetailedScale,
    enDepthInstruction,
    enBackgroundDetailBalance,
    enCameraView,
    enMotionBackground,
    enEnvironment,
    `Use a ${aspect.en}.`,
    getFramingSummaryEnglish(data),
    `${getOptionEnglish("depth", effectiveDepth)}, ${enEffect}.`,
    "Regardless of shot type, do not stretch the torso vertically to fill the frame.",
    "Clean Japanese manga linework, readable silhouette, expressive mood, polished image-generation prompt style."
  ], "\n");
}

function getPersonOnlyPrompt(data) {
  const subject = String(data.get("subject") || "").trim();
  const subjectPhrase = stripTrailingPunctuation(subject);
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
  const hasSubjectReference = hasReference(data, "subjectReference");

  const jpSubject = subjectPhrase || "魅力的な人物・キャラクター";
  const jpAction = subjectPhrase
    ? `最重要の表情・動作指定: ${subjectPhrase}。この表情と動作を必ず画面の主役として描く。`
    : "";
  const jpReference = hasSubjectReference
    ? "被写体は添付画像を参照する。"
    : "";
  const jpStyleLock = getStyleLockJapanese(data);
  const jpBodyProportionLock = getBodyProportionLockJapanese(data, false);
  const jpDeformedComposition = getDeformedCompositionJapanese(data, false, false);
  const jpConsistencyLock = getConsistencyLockJapanese(data);
  const jpCameraView = getOptionalJapanese(cameraView) ? `カメラビューは${cameraView}。` : "";
  const [jpMotionBackground, enMotionBackground] = getPersonMotionNote(motionBackground);
  const jpEnvironment = getBackgroundEnvironmentJapanese(timeOfDay, weatherLight, atmosphere);
  const jpEffectSentence = effect === "なし"
    ? `${getPersonDepthJapanese(depth)}で、漫画演出は控えめにする。`
    : `${getPersonDepthJapanese(depth)}で、${effect}を使った漫画演出を加える。`;

  jpPrompt.value = compactJoin([
    jpReference,
    jpStyleLock,
    jpBodyProportionLock,
    jpDeformedComposition,
    jpConsistencyLock,
    "人物のみを生成する。",
    "背景、場所、部屋、家具、風景を描かない。",
    "背景は白地または単色のシンプルな背景にする。",
    "透過背景にはしない。",
    jpAction,
    "被写体の表情、動作、ポーズ、視線、手元を最優先で描く。",
    jpCameraView,
    jpMotionBackground,
    jpEnvironment,
    `${jpSubject}を描いた人物のみの漫画調画像。`,
    `アスペクト比は${aspect.value}。`,
    getFramingSummaryJapanese(data),
    jpEffectSentence,
    "自然な日本の漫画らしい線、読みやすいシルエット、表情と動作が伝わる仕上がり。"
  ], "\n");

  const enSubject = translateFreeText(subjectPhrase, preserveOriginalText(subjectPhrase, "the subject and action described in Japanese")) || "an appealing character";
  const enReference = hasSubjectReference
    ? "Use the attached subject reference image."
    : "";
  const enStyleLock = getStyleLockEnglish(data);
  const enBodyProportionLock = getBodyProportionLockEnglish(data, false);
  const enDeformedComposition = getDeformedCompositionEnglish(data, false, false);
  const enConsistencyLock = getConsistencyLockEnglish(data);
  const enAction = subjectPhrase
    ? "Most important action and expression: depict the specified subject/action as the main focus of the image."
    : "";
  const enCameraView = getOptionEnglish("cameraView", cameraView) ? `Camera view: ${getOptionEnglish("cameraView", cameraView)}.` : "";
  const enEnvironment = getBackgroundEnvironmentEnglish(timeOfDay, weatherLight, atmosphere);
  const enEffect = effect === "なし" ? "with subtle manga presentation and no special manga effects" : `with ${getOptionEnglish("effect", effect)}`;

  enPrompt.value = compactJoin([
    enReference,
    enStyleLock,
    enBodyProportionLock,
    enDeformedComposition,
    enConsistencyLock,
    "Generate a character-only image.",
    "No background scenery, no room, no furniture, no environment.",
    "Use a plain white or simple solid-color background.",
    "Do not use a transparent background.",
    enAction,
    "Focus on the character, pose, expression, gaze, hands, and action.",
    enCameraView,
    enMotionBackground,
    enEnvironment,
    `A manga-style character-only image of ${enSubject}.`,
    `Use a ${aspect.en}.`,
    getFramingSummaryEnglish(data),
    `${getPersonDepthEnglish(depth)}, ${enEffect}.`,
    "Clean Japanese manga linework, readable silhouette, expressive pose and emotion, polished image-generation prompt style."
  ], "\n");
}

function updateAspectDescription() {
  updateAspectDescriptionAndRestrictions();
  updateConsistencyUi();
}

function updateModeUi() {
  const data = new FormData(form);
  const generationMode = data.get("generationMode");
  const isPersonBackgroundMode = generationMode === "personBackground";
  const isPersonMode = generationMode === "person";
  const isBackgroundMode = generationMode === "background";

  const setFieldDisabled = (field, disabled) => {
    field.hidden = false;
    field.classList.toggle("is-mode-disabled", disabled);
    field.setAttribute("aria-disabled", String(disabled));
    field.querySelectorAll("input, select, textarea").forEach((control) => {
      control.disabled = disabled;
    });
  };

  document.querySelectorAll("[data-person-field]").forEach((field) => {
    setFieldDisabled(field, isBackgroundMode);
  });

  document.querySelectorAll("[data-background-section]").forEach((field) => {
    setFieldDisabled(field, isPersonMode);
  });

  document.querySelectorAll("[data-background-field]").forEach((field) => {
    setFieldDisabled(field, !isBackgroundMode);
  });

  document.querySelectorAll("[data-person-background-field]").forEach((field) => {
    setFieldDisabled(field, !isPersonBackgroundMode);
  });

  const effectField = document.querySelector("#effect")?.closest(".field-card");
  if (effectField) {
    setFieldDisabled(effectField, isBackgroundMode);
  }

  const hasBackgroundReference = data.get("backgroundReference") === "yes";
  if (backgroundReferenceUsageWrap) {
    backgroundReferenceUsageWrap.hidden = !hasBackgroundReference || isPersonMode;
    backgroundReferenceUsageWrap.classList.toggle("is-mode-disabled", !hasBackgroundReference || isPersonMode);
    backgroundReferenceUsageWrap.setAttribute("aria-disabled", String(!hasBackgroundReference || isPersonMode));
    backgroundReferenceUsageWrap.querySelectorAll("input, select, textarea").forEach((control) => {
      control.disabled = !hasBackgroundReference || isPersonMode;
    });
  }

  if (backgroundReferenceUsageHint && backgroundReferenceUsageSelect) {
    const usage = backgroundReferenceUsageSelect.value;
    const usageHints = {
      "背景全体を参照": "背景全体の構造や雰囲気を使います。上半身などでは注意が出ます。",
      "画面内に入る範囲だけ参照": "指定ショットに入る範囲だけ使います。背景を入れるためにカメラを引きません。",
      "接触家具・作業面だけ参照": "机・椅子・PC・小物など、人物が接するものの位置とサイズだけ使います。",
      "小物・道具だけ参照": "道具や持ち物だけを使い、部屋や空間全体は再現しません。",
      "配置図として参照": "アイソメ図や平面図の配置だけを使い、最終画像は選択したカメラビューに変換します。",
      "空間の前後関係だけ参照": "前景・中景・背景の順番だけを使います。"
    };
    backgroundReferenceUsageHint.textContent = usageHints[usage] || "背景参照を有にしたとき、添付画像をどの範囲で使うかを選びます。";
  }

  backgroundReferenceHint.textContent = isBackgroundMode
    ? "有の場合、添付画像の人物は参照せず、参照画像の使い方に従って背景を作ります。部屋以外の場所にも使えます。"
    : isPersonBackgroundMode
      ? "有の場合、下の『参照画像の使い方』で、背景全体・接触家具・配置図などの用途を選べます。"
    : "有の場合、添付画像の場所・背景・空間構成をプロンプトに反映します。部屋以外の場所にも使えます。";
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
fillSelect("screenComposition", optionGroups.screenComposition, "デフォルメキャラ優先");
fillSelect("depth", optionGroups.depth, "自然な奥行き");
fillSelect("motionBackground", optionGroups.motionBackground, "指定なし");
fillSelect("effect", optionGroups.effect, "なし");
fillSelect("alternateViewpoint", optionGroups.alternateViewpoint, "斜め前");
fillSelect("backgroundReferenceUsage", optionGroups.backgroundReferenceUsage, "画面内に入る範囲だけ参照");
fillSelect("timeOfDay", optionGroups.timeOfDay, "なし");
fillSelect("weatherLight", optionGroups.weatherLight, "なし");
fillSelect("atmosphere", optionGroups.atmosphere, "なし");
fillSelect("scalePreset", optionGroups.scalePreset, personBackgroundScaleDefaults.scalePreset);
fillSelect("workSurfaceHeight", optionGroups.workSurfaceHeight, personBackgroundScaleDefaults.workSurfaceHeight);
fillSelect("propScale", optionGroups.propScale, personBackgroundScaleDefaults.propScale);
fillSelect("unwantedFurniture", optionGroups.unwantedFurniture, personBackgroundScaleDefaults.unwantedFurniture);
fillSelect("backgroundStructureScale", optionGroups.backgroundStructureScale, personBackgroundScaleDefaults.backgroundStructureScale);
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
  document.querySelector(".advanced-settings")?.removeAttribute("open");
  document.querySelector("#subject").value = "";
  const backgroundDetailInput = document.querySelector("#backgroundDetail");
  if (backgroundDetailInput) backgroundDetailInput.value = "";
  const spatialRelationInput = document.querySelector("#spatialRelation");
  if (spatialRelationInput) spatialRelationInput.value = "";
  aspectSelect.value = "4:3 標準横構図";
  const backgroundReferenceUsageInput = document.querySelector("#backgroundReferenceUsage");
  if (backgroundReferenceUsageInput) backgroundReferenceUsageInput.value = "画面内に入る範囲だけ参照";
  resetPersonBackgroundScaleDefaults();
  updateAspectDescription();
  updateModeUi();
  generatePrompt();
});

document.querySelectorAll(".copy-button").forEach((button) => {
  button.addEventListener("click", () => copyText(button.dataset.copyTarget));
});
