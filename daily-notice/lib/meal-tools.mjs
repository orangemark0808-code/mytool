export const COOKING_TOOLS = [
  {id:'pan', label:'フライパン', description:'ふたを使った蒸し煮・卵とじ。いつもの調理方法です。'},
  {id:'steamer', label:'せいろ', description:'重ねすぎずに蒸します。汁気のある料理には耐熱皿を使います。'},
  {id:'rede', label:'電気圧力鍋', description:'Re・De Pot PCH-20L（2L）。水を使った煮込みを提案します。'},
];
export const REDE_MANUAL = 'https://re-de.jp/support/pot/pch-20l_manual.pdf';
export const normalizeMealTool = value => COOKING_TOOLS.some(tool => tool.id === value) ? value : 'pan';

// Retain each meat/fish entry as one portion; do not split it to fit the pot.
export function pressureAnchorAllowed(item, kind, quantity) {
  if (kind === 'egg') return false;
  if (kind === 'meat' || kind === 'fish') return item.unit === 'g' && quantity !== null && quantity <= 500;
  return kind === 'vegetable' || kind === 'tofu';
}

export function toolCookingPlan(tool, kind, hasVegetables, rootVegetables) {
  if (tool === 'steamer') {
    const preparation = kind === 'meat' || kind === 'fish'
      ? (kind === 'meat' ? '肉は解凍し、厚さ1cm以下に切ります。' : '魚は解凍し、骨を除いて厚さ1cm以下に切ります。') + (hasVegetables ? '野菜は食べやすく、根菜は薄く切ります。' : '')
      : kind === 'vegetable' ? '野菜は食べやすく切り、根菜は薄切りにします。'
      : kind === 'tofu' ? '豆腐類は水気を切り、厚さ1cmほどに切ります。' + (hasVegetables ? '野菜と根菜は薄く切ります。' : '')
      : hasVegetables ? '野菜と根菜は薄切りにします。' : '浅い耐熱器を用意します。';
    return {method:kind === 'egg' ? 'せいろ蒸し卵' : 'せいろ蒸し', water:kind === 'egg' ? '卵と同量の水＋蒸し用の湯' : '蒸し用の湯（鍋に合わせて十分な量）', timeLabel:'蒸し10〜15分が目安', steps:[
      'せいろを水でぬらし、下の鍋に十分な湯を沸かします。調理中に湯がなくならないようにします。',
      preparation,
      kind === 'egg'
        ? '卵を溶き、同量の水と調味料を混ぜ、浅い耐熱器に入れてせいろに置きます。' + (hasVegetables ? '薄切りにした野菜も加えます。' : '')
        : '食材と調味料を浅い耐熱皿に入れ、蒸気の通り道を残してせいろに置きます。',
      '蒸気が十分上がってからふたをし、10〜15分を目安に蒸します。厚みや量によって加熱を延ばしてください。',
      kind === 'meat' ? '肉の中心75℃で1分以上を確認し、不十分ならさらに蒸します。'
        : kind === 'fish' || kind === 'egg' ? '中心まで十分に火が通っていることを確認し、不十分ならさらに蒸します。'
        : '食材全体に火が通り、やわらかくなったら取り出します。',
      '熱い蒸気と皿に気をつけて取り出し、味を確認して盛り付けます。',
    ]};
  }
  if (tool === 'rede') {
    const minutes = kind === 'meat' ? 5 : kind === 'fish' || rootVegetables ? 3 : kind === 'tofu' ? 2 : 1;
    const preparation = kind === 'meat'
      ? '肉は解凍し、厚さ1cm以下の一口大に切ります。ひき肉は固めずほぐします。'
      : kind === 'fish' ? '魚は解凍し、骨を除いて厚さ2cm以下に切ります。'
      : kind === 'tofu' ? '豆腐類は水気を切り、一口大に切ります。' : '野菜を食べやすく切ります。';
    return {method:'Re・De Pot煮込み', water:'水300mL（加圧用・調味料とは別）', timeLabel:`加圧${minutes}分＋予熱・減圧`, steps:[
      preparation + (hasVegetables ? '一緒に使う野菜は食べやすく、根菜は厚さ5mm以下に切ります。' : ''),
      '内がまに食材と水300mLを入れます。水を含めて「調理MAX」を超えないことを確認します。調味料は加圧後に加えます。',
      'ふた・パッキンを確認して閉め、圧力切替弁を「密封」にします。「切替」で圧力を選び、' + minutes + '分に設定して「スタート／決定」を押します。',
      '加圧終了後は自然に圧力表示ピンが下がるまで待ちます（5〜30分が目安）。ピンが上がっている間は弁やふたを操作しません。',
      'ピンが下がったら、ミトンを使い、弁を「排気」にして残った蒸気を抜いてからふたを開けます。',
      kind === 'meat'
        ? '肉の中心75℃で1分以上を確認します。不十分ならふたを開けたまま「温め」で追加加熱します。'
        : '食材の中心まで火が通っていることを確認し、不十分ならふたを開けたまま「温め」で追加加熱します。',
      '調味料を混ぜて加え、ふたを開けたまま「温め」でひと煮立ちさせ、味を確認します。水量・加圧時間はこの食材量での目安です。内がまに収まらない場合は別の器具の候補を選んでください。',
    ]};
  }
  return null;
}
