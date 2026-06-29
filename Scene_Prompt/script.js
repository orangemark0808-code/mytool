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
    ["配置図:位置関係だけ参照", "use only the positional relationships from the layout diagram"],
    ["画面内に入る範囲だけ参照", "use only the visible area that fits in the frame"],
    ["接触家具・作業面だけ参照", "use only contact furniture and work surfaces"],
    ["背景全体・部屋構造を参照", "use the whole background and room/spatial structure reference"],
    ["小物・道具だけ参照", "use only props and tools"],
    ["空間の前後関係だけ参照", "use only spatial depth order"]
  ],
  workSeatLock: [
    ["なし", ""],
    ["この部屋の作業席を固定する", "lock the work seat layout for this room"]
  ],
  sideViewDirection: [
    ["なし", ""],
    ["右向き横顔", "right-facing profile", "右向き横顔"],
    ["左向き横顔", "left-facing profile", "左向き横顔"],
    ["正面", "front-facing", "正面"],
    ["後ろ姿", "back view", "後ろ姿"]
  ],
  backdropAnchor: [
    ["自動", "auto"],
    ["背後はドア側の壁", "use the door-side wall behind the protagonist", "ドア・壁が見える"],
    ["背後は右壁家具側", "use the right-wall furniture side behind or beside the protagonist", "本棚・棚が見える"],
    ["背後は窓・ベッド側", "use the window and bed side behind the protagonist", "窓・ベッドが見える"],
    ["背後は白背景または簡略背景", "use a white or simplified background behind the protagonist", "シンプル・白背景"]
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
const workSeatLockWrap = document.querySelector("#workSeatLockWrap");
const workSeatLockSelect = document.querySelector("#workSeatLock");
const workSeatLockHint = document.querySelector("#workSeatLockHint");
const sideViewDirectionWrap = document.querySelector("#sideViewDirectionWrap");
const sideViewDirectionSelect = document.querySelector("#sideViewDirection");
const sideViewDirectionHint = document.querySelector("#sideViewDirectionHint");
const backdropAnchorWrap = document.querySelector("#backdropAnchorWrap");
const backdropAnchorSelect = document.querySelector("#backdropAnchor");
const backdropAnchorHint = document.querySelector("#backdropAnchorHint");

function fillSelect(selectId, options, defaultValue) {
  const select = document.querySelector(`#${selectId}`);
  select.innerHTML = "";
  options.forEach((option) => {
    const item = document.createElement("option");
    const value = Array.isArray(option) ? option[0] : option.value;
    // option[2] があれば表示名として使う（valueは変えない）
    const label = Array.isArray(option) && option[2] ? option[2] : value;
    item.value = value;
    item.textContent = label;
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

function getWorkSeatLock(data) {
  return data.get("workSeatLock") || "なし";
}

function shouldUseFixedRoomWorkSeat(data) {
  return getGenerationMode(data) === "personBackground"
    && hasReference(data, "backgroundReference")
    && getBackgroundReferenceUsage(data) === "配置図:位置関係だけ参照"
    && getWorkSeatLock(data) === "この部屋の作業席を固定する";
}

function getFixedRoomWorkSeatJapanese(data) {
  if (!shouldUseFixedRoomWorkSeat(data)) return "";

  return compactJoin([
    "【部屋内の作業席固定】",
    "添付の平面図は、最終画像のカメラアングルではなく、家具配置と距離感の参照として使う。",
    "この部屋では、机は部屋の中央手前、椅子は机の手前側に固定する。",
    "棚・本棚・クローゼットは、平面図上の右壁側にある家具として扱う。",
    "窓とベッドは奥壁側、ドアはドア側の壁として扱う。",
    "作業席固定では机・椅子・右壁家具・窓・ベッド・ドアの位置関係だけを固定し、主人公の背後背景はサイドビュー方向や人物の背後背景の指定に従って決める。",
    "部屋の家具を見せるためにカメラを引いたり、上半身ショットを全身構図に変えたりしない。"
  ], "\n");
}

function getFixedRoomWorkSeatEnglish(data) {
  if (!shouldUseFixedRoomWorkSeat(data)) return "";

  return compactJoin([
    "Fixed work-seat layout for this room:",
    "Use the attached floor plan as a furniture-layout and distance reference, not as the final camera angle.",
    "In this room, the desk is fixed near the front-center of the room, and the chair is fixed on the near side of the desk.",
    "Treat the shelves, bookcases, and closet as furniture along the right wall in the floor plan.",
    "Treat the window and bed as the back-wall side, and the door as the door-side wall.",
    "This work-seat lock fixes only the positional relationships of the desk, chair, right-wall furniture, window, bed, and door. Decide the background behind the protagonist according to the side-view direction or backdrop-anchor setting.",
    "Do not pull the camera back or change an upper-body shot into a full-body composition just to show the room furniture."
  ], "\n");
}


function getSideViewDirection(data) {
  return data.get("sideViewDirection") || "なし";
}

function shouldUseSideViewDirectionLock(data) {
  return getGenerationMode(data) === "personBackground"
    && getSideViewDirection(data) !== "なし";
}

function getSideViewDirectionJapanese(data) {
  if (!shouldUseSideViewDirectionLock(data)) return "";
  const direction = getSideViewDirection(data);

  if (direction === "右向き横顔") {
    return compactJoin([
      "【サイドビュー左右固定】",
      "サイドビューでは、主人公を右向きの横顔にする。",
      "この向きでは、主人公の背後側はドア側の壁になる。",
      "棚・本棚・クローゼットを主人公の背後に置かない。",
      "右壁家具は見えにくい位置にあるため、画角に自然に入る場合だけ画面端に控えめに見せる。",
      "右壁家具を見せるために、人物の向きやカメラ位置を反転しない。"
    ], "\n");
  }

  if (direction === "左向き横顔") {
    return compactJoin([
      "【サイドビュー左右固定】",
      "サイドビューでは、主人公を左向きの横顔にする。",
      "平面図上の右壁側にある棚・本棚・クローゼットのうち、少なくとも一つを画面右端に実際に見せる。",
      "右壁家具は省略しない。",
      "主人公を中央固定にしない。主人公をやや左寄せに配置し、画面右端に右壁家具が入る余白を確保する。",
      "右壁家具は主人公の真後ろに重ねず、主人公の横方向または画面右端の家具として部分的に見せる。",
      "ただし、机・主人公・椅子と指定ショットを優先し、右壁家具を見せるためにカメラを引かない。"
    ], "\n");
  }

  return "";
}

function getSideViewDirectionEnglish(data) {
  if (!shouldUseSideViewDirectionLock(data)) return "";
  const direction = getSideViewDirection(data);

  if (direction === "右向き横顔") {
    return compactJoin([
      "Side-view left/right lock:",
      "In the side view, make the protagonist a right-facing profile.",
      "With this direction, the door-side wall is behind the protagonist's back.",
      "Do not place shelves, bookcases, or the closet behind the protagonist.",
      "The right-wall furniture is harder to see from this direction; show it only subtly at the edge of the frame if it naturally fits.",
      "Do not flip the protagonist or camera position just to show the right-wall furniture."
    ], "\n");
  }

  if (direction === "左向き横顔") {
    return compactJoin([
      "Side-view left/right lock:",
      "In the side view, make the protagonist a left-facing profile.",
      "Show at least one piece of the right-wall furniture from the floor plan, such as a shelf, bookcase, or closet, at the right edge of the frame.",
      "Do not omit the right-wall furniture.",
      "Do not keep the protagonist rigidly centered. Place the protagonist slightly to the left so there is room for the right-wall furniture at the right edge.",
      "Do not place the right-wall furniture directly behind the protagonist; show it partially as side furniture or edge-of-frame furniture.",
      "Prioritize the desk, protagonist, chair, and selected shot size; do not pull the camera back just to show the right-wall furniture."
    ], "\n");
  }

  return "";
}

function getBackdropAnchor(data) {
  return data.get("backdropAnchor") || "自動";
}

function shouldUseBackdropAnchorLock(data) {
  // backdropAnchor（背景に何を見せるか）は廃止。常にfalse。
  return false;
}

// myRoom専用：被写体の向きに応じた空間記述ブロック
function getMyRoomDirectionJapanese(data) {
  const isMyRoom = (data.get("generationMode") || "") === "myRoom";
  if (!isMyRoom) return "";

  const direction = data.get("sideViewDirection") || "なし";

  if (direction === "左向き横顔") {
    return compactJoin([
      "【自分の部屋・左向き横顔】",
      "主人公を左向きの横顔にする。",
      "画面左側に机・PC・ランプ・マグカップなどの作業道具を配置する。",
      "画面右端にクローゼット・棚・本棚のうち少なくとも一つを実際に見せる。",
      "右側家具は省略しない。主人公をやや左寄せに配置し、右端に家具の余白を確保する。",
      "右側家具は主人公の真後ろに重ねず、横方向または画面右端の背景として部分的に見せる。",
      "主人公の背後（奥の壁）はシンプルな壁にする。窓・ベッドを背後に入れない。",
      "机の上のPCは13インチのノートパソコンにする。デスクトップPCや大型モニターにしない。",
      "壁にポスター・掲示物・貼り紙を描かない。",
      "机・主人公・椅子と指定ショットを優先し、右側家具を見せるためにカメラを引かない。"
    ], "\n");
  }

  if (direction === "右向き横顔") {
    return compactJoin([
      "【自分の部屋・右向き横顔】",
      "主人公を右向きの横顔にする。",
      "画面右側に机・PC・ランプ・マグカップなどの作業道具を配置する。",
      "主人公の背後または画面左端にクローゼット・棚・本棚を自然に配置する。",
      "主人公の背後に棚・家具が自然に見えるようにする。",
      "窓・ベッドは背後に入れない。背後はドア側の壁または棚を基本にする。",
      "机の上のPCは13インチのノートパソコンにする。デスクトップPCや大型モニターにしない。",
      "壁にポスター・掲示物・貼り紙を描かない。",
      "机・主人公・椅子と指定ショットを優先し、カメラを引かない。"
    ], "\n");
  }

  if (direction === "正面") {
    return compactJoin([
      "【自分の部屋・正面向き】",
      "主人公を正面向きにする。カメラは主人公の正面（机側）から撮る。",
      "主人公の背後はほとんどがシンプルな壁。ドアが映る場合は画面右寄りに配置する。",
      "画面左側に本棚・棚を配置する。",
      "窓・ベッド・クローゼットは主人公の背後には入れない。",
      "机の上のPCは13インチのノートパソコンにする。デスクトップPCや大型モニターにしない。",
      "壁にポスター・掲示物・貼り紙を描かない。",
      "机・主人公・椅子と指定ショットを優先し、カメラを引いて部屋全体を説明しない。"
    ], "\n");
  }

  if (direction === "後ろ姿") {
    return compactJoin([
      "【自分の部屋・後ろ姿】",
      "主人公を後ろ姿にする。カメラは主人公の背後から撮る。",
      "主人公の前方（カメラから見て奥）にベッド・窓・クローゼットを配置する。",
      "画面右側にクローゼット・本棚・棚を配置する。",
      "ドアは描かない（背後側のためフレームに入らない）。",
      "机の上のPCは13インチのノートパソコンにする。デスクトップPCや大型モニターにしない。",
      "壁にポスター・掲示物・貼り紙を描かない。",
      "机・PC・作業道具が主人公の手前に自然に見えるようにする。",
      "カメラを引いて部屋全体を説明しない。"
    ], "\n");
  }

  // なし（向き自動）の場合は簡易ブロック
  return compactJoin([
    "【自分の部屋・作業席固定】",
    "主人公は椅子に座り、机・PC・作業道具が見える構図にする。",
    "部屋の構造が自然に伝わる背景要素を配置する。",
    "机の上のPCは13インチのノートパソコンにする。デスクトップPCや大型モニターにしない。",
    "壁にポスター・掲示物・貼り紙を描かない。",
    "カメラを引いて部屋全体を説明しない。"
  ], "\n");
}

function getMyRoomDirectionEnglish(data) {
  const isMyRoom = (data.get("generationMode") || "") === "myRoom";
  if (!isMyRoom) return "";

  const direction = data.get("sideViewDirection") || "なし";

  if (direction === "左向き横顔") {
    return compactJoin([
      "My-room layout — left-facing profile:",
      "Show the protagonist in a left-facing side profile.",
      "Place the desk, PC, lamp, mug, and other work items on the left side of the frame.",
      "Show at least one of the closet, shelf, or bookcase on the right edge of the frame.",
      "Do not omit the right-side furniture. Position the protagonist slightly left of center to leave room for the furniture on the right.",
      "Do not overlap the right-side furniture directly behind the protagonist; show it at the side or as a partial background element on the right edge.",
      "Keep the background behind the protagonist (the far wall) simple. Do not place a window or bed behind the protagonist.",
      "The PC on the desk is a 13-inch laptop. Do not draw a desktop PC or a large monitor.",
      "Do not draw posters, notices, or papers on the wall.",
      "Prioritize the desk, protagonist, chair, and the selected shot size; do not pull the camera back just to show the right-side furniture."
    ], "\n");
  }

  if (direction === "右向き横顔") {
    return compactJoin([
      "My-room layout — right-facing profile:",
      "Show the protagonist in a right-facing side profile.",
      "Place the desk, PC, lamp, mug, and other work items on the right side of the frame.",
      "Naturally place the closet, shelf, or bookcase behind the protagonist or on the left edge of the frame.",
      "Let shelves or furniture appear naturally behind the protagonist.",
      "Do not place a window or bed behind the protagonist. Use the door-side wall or shelves as the background.",
      "The PC on the desk is a 13-inch laptop. Do not draw a desktop PC or a large monitor.",
      "Do not draw posters, notices, or papers on the wall.",
      "Prioritize the desk, protagonist, chair, and the selected shot size; do not pull the camera back."
    ], "\n");
  }

  if (direction === "正面") {
    return compactJoin([
      "My-room layout — front-facing:",
      "Show the protagonist facing the camera directly. The camera shoots from the desk side.",
      "The background behind the protagonist is mostly a simple wall. If the door appears, place it toward the right side of the frame.",
      "Place the bookcase and shelves on the left side of the frame.",
      "Do not place the window, bed, or closet behind the protagonist.",
      "The PC on the desk is a 13-inch laptop. Do not draw a desktop PC or a large monitor.",
      "Do not draw posters, notices, or papers on the wall.",
      "Prioritize the desk, protagonist, chair, and the selected shot size; do not pull the camera back to explain the whole room."
    ], "\n");
  }

  if (direction === "後ろ姿") {
    return compactJoin([
      "My-room layout — back view:",
      "Show the protagonist from behind. The camera shoots from behind the protagonist.",
      "In front of the protagonist (deeper into the scene), place the bed, window, and closet.",
      "Place the closet, bookcase, and shelves on the right side of the frame.",
      "Do not draw the door (it is on the back side and out of frame).",
      "The PC on the desk is a 13-inch laptop. Do not draw a desktop PC or a large monitor.",
      "Do not draw posters, notices, or papers on the wall.",
      "Show the desk, PC, and work tools naturally in front of the protagonist.",
      "Do not pull the camera back to explain the whole room."
    ], "\n");
  }

  return compactJoin([
    "My-room layout — work seat fixed:",
    "Show the protagonist seated at the desk with the PC and work tools visible.",
    "Include background elements that naturally convey the room structure.",
    "The PC on the desk is a 13-inch laptop. Do not draw a desktop PC or a large monitor.",
    "Do not draw posters, notices, or papers on the wall.",
    "Do not pull the camera back to explain the whole room."
  ], "\n");
}

function getBackdropAnchorJapanese(data) {
  if (!shouldUseBackdropAnchorLock(data)) return "";
  const anchor = getBackdropAnchor(data);

  if (anchor === "背後はドア側の壁") {
    return compactJoin([
      "【人物の背後背景固定】",
      "主人公の背後背景はドア側の壁を基本にする。",
      "棚・本棚・クローゼットを主人公の真後ろに置かない。",
      "椅子の背もたれ、少しの床、壁面で背後の空間を整理する。",
      "窓・ベッド・右壁家具は、画角に自然に入る場合だけ控えめに見せる。"
    ], "\n");
  }

  if (anchor === "背後は右壁家具側") {
    return compactJoin([
      "【人物の背後背景固定】",
      "主人公の背後または横方向に、平面図上の右壁側家具を配置する。",
      "棚・本棚・クローゼットは、画角に自然に入る範囲で見せる。",
      "ただし、人物を小さくしたり、上半身ショットを全身構図に変えたりしない。",
      "机・主人公・椅子を主役にし、右壁家具は背景要素として扱う。"
    ], "\n");
  }

  if (anchor === "背後は窓・ベッド側") {
    return compactJoin([
      "【人物の背後背景固定】",
      "主人公の背後背景に、奥壁の窓とベッド側を使う。",
      "窓とベッドは部屋の位置関係を示す背景要素として扱う。",
      "机・主人公・手元の動作を邪魔しない範囲で、背景の一部として描く。",
      "部屋全体を説明するためにカメラを引かない。"
    ], "\n");
  }

  if (anchor === "背後は白背景または簡略背景") {
    return compactJoin([
      "【人物の背後背景固定】",
      "主人公の背後は白背景、薄い壁、または簡略化した背景にする。",
      "棚・本棚・クローゼット・ベッド・窓などを無理に入れない。",
      "人物の表情、姿勢、手元、接触面を優先する。",
      "場所が分かる最低限の線や影だけを残す。"
    ], "\n");
  }

  return "";
}

function getBackdropAnchorEnglish(data) {
  if (!shouldUseBackdropAnchorLock(data)) return "";
  const anchor = getBackdropAnchor(data);

  if (anchor === "背後はドア側の壁") {
    return compactJoin([
      "Backdrop anchor behind the protagonist:",
      "Use the door-side wall as the main background behind the protagonist.",
      "Do not place shelves, bookcases, or the closet directly behind the protagonist.",
      "Organize the background with the chair backrest, a small area of floor, and the wall surface.",
      "Show the window, bed, or right-wall furniture only subtly if they naturally fit in the frame."
    ], "\n");
  }

  if (anchor === "背後は右壁家具側") {
    return compactJoin([
      "Backdrop anchor behind the protagonist:",
      "Place the right-wall furniture from the floor plan behind or beside the protagonist.",
      "Show shelves, bookcases, and the closet only if they naturally fit in the frame.",
      "Do not make the protagonist smaller or turn an upper-body shot into a full-body composition just to show the furniture.",
      "Keep the desk, protagonist, and chair as the main focus; treat the right-wall furniture as background elements."
    ], "\n");
  }

  if (anchor === "背後は窓・ベッド側") {
    return compactJoin([
      "Backdrop anchor behind the protagonist:",
      "Use the back-wall window and bed side as the background behind the protagonist.",
      "Treat the window and bed as spatial background elements that show the room layout.",
      "Draw them only where they do not interfere with the desk, protagonist, or hand/action details.",
      "Do not pull the camera back just to explain the whole room."
    ], "\n");
  }

  if (anchor === "背後は白背景または簡略背景") {
    return compactJoin([
      "Backdrop anchor behind the protagonist:",
      "Use a white background, a simple wall, or a simplified background behind the protagonist.",
      "Do not force shelves, bookcases, the closet, the bed, or the window into the frame.",
      "Prioritize the character's expression, pose, hands, and contact surface.",
      "Keep only the minimal lines and shadows needed to suggest the place."
    ], "\n");
  }

  return "";
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
  const raw = data.get("generationMode") || "personBackground";
  // myRoom は personBackground と同じロジックで動作する
  return raw === "myRoom" ? "personBackground" : raw;
}

function isMyRoomMode(data) {
  return (data.get("generationMode") || "") === "myRoom";
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
  const isMyRoom = generationMode === "myRoom";
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

    if (hasReference(data, "backgroundReference") && getBackgroundReferenceUsage(data) === "配置図:位置関係だけ参照" && isCloseOrUpperShot(shot)) {
      items.push({ level: "warn", text: shouldUseFixedRoomWorkSeat(data)
        ? `${shot}＋配置図参照：作業席固定を使い、図面の俯瞰は再現しません。`
        : `${shot}＋配置図参照：図面の俯瞰ではなく、選択したカメラビューに変換します。` });
    }

    if (shouldUseFixedRoomWorkSeat(data)) {
      items.push({ level: "warn", text: "作業席固定：机・椅子・右壁家具・窓・ベッド・ドアの位置関係だけを固定します。背後背景はサイドビュー方向から決めます。" });
    }

    const selectedSideViewDirection = getSideViewDirection(data);
    const isSideViewCamera = cameraView === "サイドビュー" || cameraView === "斜めサイドビュー";

    // myRoomモードではカメラビューとの整合性チェックはしない（自由に選べるため）
    if (!isMyRoom && (selectedSideViewDirection === "右向き横顔" || selectedSideViewDirection === "左向き横顔") && !isSideViewCamera) {
      items.push({ level: "warn", text: `サイドビュー方向（${selectedSideViewDirection}）を指定中ですが、カメラビューが${cameraView}です。サイドビューまたは斜めサイドビューにすると整合します。` });
    }

    if (shouldUseSideViewDirectionLock(data)) {
      items.push({ level: "warn", text: `サイドビュー方向：${getSideViewDirection(data)}として、左右関係を固定します。` });
      if (getSideViewDirection(data) === "左向き横顔") {
        items.push({ level: "warn", text: "左向き横顔：右壁家具を画面右端に実際に入れるため、人物はやや左寄せに補正します。" });
        if (getBackgroundReferenceUsage(data) !== "配置図:位置関係だけ参照") {
          items.push({ level: "warn", text: "右壁家具を固定したい場合は、参照画像の使い方は「配置図:位置関係だけ参照」が安定します。" });
        }
      }
      if (direction !== "横顔") {
        items.push({ level: "warn", text: "サイドビュー方向を指定中です。被写体の向きは横顔寄りに補正します。" });
      }
    }

    if (shouldUseBackdropAnchorLock(data)) {
      items.push({ level: "warn", text: `人物の背後背景：${getBackdropAnchor(data)}として、人物の後ろに来る背景を固定します。` });
    }

    if (selectedSideViewDirection === "右向き横顔：背後はドア側の壁" && getBackdropAnchor(data) === "背後は右壁家具側") {
      items.push({ level: "warn", text: "右向き横顔はドア側の壁と相性が良い設定です。右壁家具を背後にしたい場合は、左向き横顔も検討してください。" });
    }

    if (selectedSideViewDirection === "左向き横顔：右壁家具を右端に見せる" && getBackdropAnchor(data) === "背後はドア側の壁") {
      items.push({ level: "warn", text: "左向き横顔は右壁家具が見えやすい設定です。背後をドア側の壁にしたい場合は、右向き横顔も検討してください。" });
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
  return hasReference(data, "backgroundReference") && getBackgroundReferenceUsage(data) === "背景全体・部屋構造を参照";
}

function hasLimitedBackgroundReference(data) {
  const usage = getBackgroundReferenceUsage(data);
  return Boolean(usage) && usage !== "背景全体・部屋構造を参照";
}

function shouldUseSpatialRelationLock(data) {
  const relation = String(data.get("spatialRelation") || "").trim();
  const usage = getBackgroundReferenceUsage(data);
  return Boolean(relation) || ["背景全体・部屋構造を参照", "画面内に入る範囲だけ参照", "配置図:位置関係だけ参照", "空間の前後関係だけ参照"].includes(usage);
}

function getBackgroundReferenceUsageNoteJapanese(data) {
  if (!hasReference(data, "backgroundReference")) return "";
  const usage = getBackgroundReferenceUsage(data);
  const notes = {
    "背景全体・部屋構造を参照": [
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
    "配置図:位置関係だけ参照": [
      "【参照画像の使い方】",
      "添付画像は配置図として使い、家具・物・場所要素の位置関係、距離感、スケール感だけを参照する。",
      "最終画像では、添付画像の俯瞰、アイソメ、真上視点、図面風のカメラ角度を再現しない。",
      "配置情報を、選択したカメラビューとショットに合う自然な構図へ変換する。",
      "配置図内の文字ラベルや記号は画像内に描かない。"
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
    "背景全体・部屋構造を参照": [
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
    "配置図:位置関係だけ参照": [
      "Reference-image usage:",
      "Use the attached image as a layout diagram: refer only to the positional relationships, distances, and scale relationships of furniture, objects, and place elements.",
      "Do not recreate the reference image's bird's-eye, isometric, top-down, or diagram-like camera angle in the final image.",
      "Convert the layout information into a natural composition that matches the selected camera view and shot.",
      "Do not draw labels, symbols, or diagram text from the layout image inside the final image."
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
  const seatedSideLines = includeEnvironment
    && (data.get("cameraView") === "サイドビュー" || data.get("cameraView") === "斜めサイドビュー" || data.get("direction") === "横顔")
    ? [
      "座り姿勢や机に向かう横顔では、首の付け根から腰までを長くしない。",
      "胸から腹までを縦に伸ばさず、添付参照画像の横面と同じ短い胴体を保つ。",
      "机の高さ、椅子の座面、キーボードや小物の位置を人物に合わせて調整し、人物の胴体を伸ばして成立させない。",
      "椅子の背もたれや机の前縁で胴体が長く見えないようにする。"
    ]
    : [];

  const environmentLines = includeEnvironment
    ? [
      "胴体を伸ばして接触面や背景要素に合わせない。",
      "必要な場合は、腕・肩・手元・接触面・小物側を調整して動作を成立させる。"
    ]
    : [];

  return compactJoin([...sharedLines, ...seatedSideLines, ...environmentLines], "\n");
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
  const seatedSideLines = includeEnvironment
    && (data.get("cameraView") === "サイドビュー" || data.get("cameraView") === "斜めサイドビュー" || data.get("direction") === "横顔")
    ? [
      "In seated poses or side-profile desk poses, do not make the neck-base-to-waist area long.",
      "Do not vertically stretch the chest-to-abdomen area; keep the same short side-view torso as in the subject reference.",
      "Adjust the desk height, chair seat, keyboard, and prop positions to the character instead of stretching the character's torso.",
      "Do not let the chair backrest or front edge of the desk make the torso look long."
    ]
    : [];

  const environmentLines = includeEnvironment
    ? [
      "Do not lengthen the torso to fit contact surfaces or background elements.",
      "Adjust arms, shoulders, hands, contact surfaces, and props instead."
    ]
    : [];

  return compactJoin([...sharedLines, ...seatedSideLines, ...environmentLines], "\n");
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

  // personBackground と myRoom はどちらも getPersonBackgroundPrompt を使う
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
  const jpFixedRoomWorkSeat = getFixedRoomWorkSeatJapanese(data);
  const enFixedRoomWorkSeat = getFixedRoomWorkSeatEnglish(data);
  const jpMyRoomSideView = getMyRoomDirectionJapanese(data);
  const enMyRoomSideView = getMyRoomDirectionEnglish(data);
  const jpSideViewDirection = getSideViewDirectionJapanese(data);
  const enSideViewDirection = getSideViewDirectionEnglish(data);
  const jpBackdropAnchor = getBackdropAnchorJapanese(data);
  const enBackdropAnchor = getBackdropAnchorEnglish(data);
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
    jpFixedRoomWorkSeat,
    jpMyRoomSideView,
    jpBackdropAnchor,
    jpSideViewDirection,
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
    enFixedRoomWorkSeat,
    enMyRoomSideView,
    enBackdropAnchor,
    enSideViewDirection,
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
  const isMyRoom = generationMode === "myRoom";
  const isPersonBackgroundMode = generationMode === "personBackground" || isMyRoom;
  const isPersonMode = generationMode === "person";
  const isBackgroundMode = generationMode === "background";

  // myRoomヒントの表示切り替え
  const myRoomHint = document.querySelector("#myRoomHint");
  if (myRoomHint) myRoomHint.style.display = isMyRoom ? "block" : "none";

  // myRoomモード時：背景参照を「無」に固定（有を選べない）、workSeatLockも固定
  if (isMyRoom) {
    const bgRefInputNone = document.querySelector('input[name="backgroundReference"][value="none"]');
    if (bgRefInputNone && !bgRefInputNone.checked) {
      bgRefInputNone.checked = true;
    }
    if (workSeatLockSelect && workSeatLockSelect.value !== "この部屋の作業席を固定する") {
      workSeatLockSelect.value = "この部屋の作業席を固定する";
    }
  }

  // myRoom時は背景参照トグルをグレーアウト（無で固定）
  const backgroundReferenceField = document.querySelector('input[name="backgroundReference"]')?.closest(".reference-upload");
  if (backgroundReferenceField) {
    backgroundReferenceField.querySelectorAll('input[name="backgroundReference"]').forEach((control) => {
      control.disabled = isMyRoom;
    });
  }

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
    const shouldHide = !hasBackgroundReference || isPersonMode;
    backgroundReferenceUsageWrap.hidden = shouldHide;
    backgroundReferenceUsageWrap.classList.toggle("is-mode-disabled", shouldHide);
    backgroundReferenceUsageWrap.setAttribute("aria-disabled", String(shouldHide));
    backgroundReferenceUsageWrap.querySelectorAll("input, select, textarea").forEach((control) => {
      control.disabled = shouldHide;
    });
  }

  const currentBackgroundReferenceUsage = backgroundReferenceUsageSelect?.value || "";
  const shouldShowWorkSeatLock = (hasBackgroundReference || isMyRoom)
    && isPersonBackgroundMode
    && (currentBackgroundReferenceUsage === "配置図:位置関係だけ参照" || isMyRoom);

  if (workSeatLockWrap) {
    workSeatLockWrap.hidden = !shouldShowWorkSeatLock;
    workSeatLockWrap.classList.toggle("is-mode-disabled", !shouldShowWorkSeatLock);
    workSeatLockWrap.setAttribute("aria-disabled", String(!shouldShowWorkSeatLock));
    workSeatLockWrap.querySelectorAll("input, select, textarea").forEach((control) => {
      // myRoomでは作業席固定のままグレーアウト
      control.disabled = !shouldShowWorkSeatLock || isMyRoom;
    });
  }

  if (!shouldShowWorkSeatLock && workSeatLockSelect) {
    workSeatLockSelect.value = "なし";
  }

  if (workSeatLockHint && workSeatLockSelect) {
    if (isMyRoom) {
      workSeatLockHint.textContent = "自分の部屋モードでは作業席固定が自動でONになります。";
    } else {
      workSeatLockHint.textContent = workSeatLockSelect.value === "この部屋の作業席を固定する"
        ? "机・椅子・右壁家具・窓・ベッド・ドアの位置関係だけを固定します。"
        : "この部屋の平面図を使う時だけ、作業席固定を選びます。";
    }
  }

  const currentSideViewDirection = sideViewDirectionSelect?.value || "なし";

  // myRoom時はsideViewDirectionを常に表示。personBackground時は従来通り
  const shouldShowSideViewDirection = isMyRoom
    || (isPersonBackgroundMode && currentSideViewDirection !== "なし");

  // backdropAnchor（背景に何を見せるか）は廃止。常に非表示。
  // myRoomでは向き（正面・後ろ姿等）で背景が自動決定される。
  if (backdropAnchorWrap) {
    backdropAnchorWrap.hidden = true;
    backdropAnchorWrap.classList.add("is-mode-disabled");
    backdropAnchorWrap.setAttribute("aria-disabled", "true");
    backdropAnchorWrap.querySelectorAll("input, select, textarea").forEach((control) => {
      control.disabled = true;
    });
  }
  if (backdropAnchorSelect) {
    backdropAnchorSelect.value = "自動";
  }

  if (sideViewDirectionWrap) {
    sideViewDirectionWrap.hidden = !shouldShowSideViewDirection;
    sideViewDirectionWrap.classList.toggle("is-mode-disabled", !isPersonBackgroundMode);
    sideViewDirectionWrap.setAttribute("aria-disabled", String(!isPersonBackgroundMode));
    sideViewDirectionWrap.querySelectorAll("input, select, textarea").forEach((control) => {
      control.disabled = !isPersonBackgroundMode;
    });
  }

  if (!isPersonBackgroundMode && sideViewDirectionSelect) {
    sideViewDirectionSelect.value = "なし";
  }

  if (sideViewDirectionHint && sideViewDirectionSelect) {
    const directionHints = {
      "なし": isMyRoom
        ? "主人公の向きを選ぶと、向きに応じた背景指定が自動で追加されます。"
        : "横顔の向き（左右）を固定したいときに選びます。",
      "右向き横顔": "主人公を右向き横顔に固定します。背後はドア側の壁になります。",
      "左向き横顔": "主人公を左向き横顔に固定します。右壁の棚・本棚を右端に見せます。",
      "正面": "主人公を正面向きにします。「背景に何を見せるか」で背後を選べます。",
      "後ろ姿": "主人公を後ろ姿にします。「背景に何を見せるか」で前方の背景を選べます。"
    };
    sideViewDirectionHint.textContent = directionHints[sideViewDirectionSelect.value] || directionHints["なし"];
  }

  if (backgroundReferenceUsageHint && backgroundReferenceUsageSelect) {
    const usage = backgroundReferenceUsageSelect.value;
    const usageHints = {
      "背景全体・部屋構造を参照": "背景全体・部屋構造・雰囲気を使います。上半身などでは注意が出ます。",
      "画面内に入る範囲だけ参照": "指定ショットに入る範囲だけ使います。背景を入れるためにカメラを引きません。",
      "接触家具・作業面だけ参照": "机・椅子・PC・小物など、人物が接するものの位置とサイズだけ使います。",
      "小物・道具だけ参照": "道具や持ち物だけを使い、部屋や空間全体は再現しません。",
      "配置図:位置関係だけ参照": "アイソメ図や平面図の位置関係だけを使い、最終画像は選択したカメラビューに変換します。必要に応じて作業席固定も選べます。",
      "空間の前後関係だけ参照": "前景・中景・背景の順番だけを使います。"
    };
    backgroundReferenceUsageHint.textContent = usageHints[usage] || "背景参照を有にしたとき、添付画像をどの範囲で使うかを選びます。";
  }

  backgroundReferenceHint.textContent = isMyRoom
    ? "自分の部屋モードでは参照画像を使いません。主人公の向きで背景を指定します。"
    : isBackgroundMode
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
fillSelect("workSeatLock", optionGroups.workSeatLock, "なし");
fillSelect("sideViewDirection", optionGroups.sideViewDirection, "なし");
fillSelect("backdropAnchor", optionGroups.backdropAnchor, "自動");
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
  const backdropAnchorInput = document.querySelector("#backdropAnchor");
  if (backdropAnchorInput) backdropAnchorInput.value = "自動";
  const workSeatLockInput = document.querySelector("#workSeatLock");
  if (workSeatLockInput) workSeatLockInput.value = "なし";
  const sideViewDirectionInput = document.querySelector("#sideViewDirection");
  if (sideViewDirectionInput) sideViewDirectionInput.value = "なし";
  resetPersonBackgroundScaleDefaults();
  updateAspectDescription();
  updateModeUi();
  generatePrompt();
});

document.querySelectorAll(".copy-button").forEach((button) => {
  button.addEventListener("click", () => copyText(button.dataset.copyTarget));
});
