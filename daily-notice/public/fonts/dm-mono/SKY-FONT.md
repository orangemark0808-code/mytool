# SKY DM Mono Regular

DM Mono Regular（Copyright 2020 The DM Mono Project Authors）のSKY表示専用派生フォント。元のフォントと同じSIL Open Font License 1.1で配布する。ライセンスと著作権表記は同じフォルダーのOFL.txt、およびフォント内部に保持する。

元のDM MonoのU+0030（数字0）は標準で斜線付きで、OpenTypeのzero機能や通常ゼロの代替字形がない。SKY専用版では数字0だけを同じフォント内の楕円形のOの輪郭へ割り当てる。数字0としてのテキスト・読み上げは維持する。元の全輪郭と等幅の送り幅を保持し、それ以外のUnicode割り当ては変更しない。ファミリー名とPostScript名をSKY DM Mono / SKYDMMono-Regularへ変更し、署名テーブルを外し、チェックサムを再生成する。元のDMMono-Regular.ttfは変更しない。

再生成: node scripts/build-sky-font.mjs

生成時にBMP全体の割り当て、0とOの同じ送り幅、完成フォントのチェックサムを検証する。SKYの数値だけに適用し、右側の集計を含む他の画面には適用しない。
