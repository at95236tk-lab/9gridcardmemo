import type { FontType, SizeGroup, TitlePos, PaperSize } from '../types/editor';

export const A4_W72 = 595;
export const A4_H72 = 842;
export const A4_W300 = 2480;
export const A4_H300 = 3508;
export const MM72 = 25.4 / 72;
export const MM300 = 25.4 / 300;
export const CONTENT_MARGIN_RATIO = 0.08;
export const HISTORY_LIMIT = 200;
export const SIDEBAR_W = 230;
export const BULK_PANEL_W = 280;
export const PANEL_MIN_W = 180;
export const PANEL_MAX_W = 460;
export const MEMO_STORAGE_KEY = 'nine-grid-card-memo.v1';
export const MEMO_OWNER_KEY = 'nine-grid-card-memo.owner-key.v1';

export const SIZES: PaperSize[] = [
  { key: 'A4', label: 'A4', w72: 595, h72: 842, w300: 2480, h300: 3508, mm: '210x297', group: 'A' },
  { key: 'A5', label: 'A5', w72: 420, h72: 595, w300: 1748, h300: 2480, mm: '148x210', group: 'A' },
  { key: 'A6', label: 'A6', w72: 298, h72: 420, w300: 1240, h300: 1748, mm: '105x148', group: 'A' },
  { key: 'A7', label: 'A7', w72: 210, h72: 298, w300: 874, h300: 1240, mm: '74x105', group: 'A' },
  { key: 'B5', label: 'B5', w72: 516, h72: 729, w300: 2150, h300: 3035, mm: '182x257', group: 'B' },
  { key: 'B6', label: 'B6', w72: 363, h72: 516, w300: 1512, h300: 2150, mm: '128x182', group: 'B' },
  { key: 'B7', label: 'B7', w72: 258, h72: 363, w300: 1075, h300: 1512, mm: '91x128', group: 'B' },
  { key: 'postcard', label: 'はがき', w72: 283, h72: 420, w300: 1181, h300: 1748, mm: '100x148', group: 'card' },
  { key: 'l-size', label: 'L判', w72: 252, h72: 360, w300: 1051, h300: 1500, mm: '89x127', group: 'card' },
  { key: 'bible', label: 'バイブル', w72: 269, h72: 482, w300: 1122, h300: 2008, mm: '95x170', group: 'book' },
  { key: 'mini5', label: 'M5', w72: 176, h72: 298, w300: 732, h300: 1240, mm: '62x105', group: 'book' },
  { key: 'hobo', label: 'ほぼ日', w72: 298, h72: 420, w300: 1240, h300: 1748, mm: '105x148', group: 'book' },
];

export const SAMPLE_TEXTS = [
  '01. 往路・復路の足跡\n―\n行：北陸新幹線 かがやき 09:00発\n座席：7号車 4番 C席（進行方向右）\n帰：しなの 24号 18:00発（松本発）\n座席：指定席 2号車 8番 A席\n新幹線eチケット 紐付け完了済み\n長野駅着後、真っ先にロッカーへ',
  '02. 眠る場所の全データ\n―\n宿：渋温泉 〇〇旅館（あるいは松本市内）\n住所：長野県下高井郡山ノ内町...\n予約：一泊二食付きプラン\nチェックイン：16:00（夕食18:30）\n外湯巡り用の鍵はフロントで受取\n近くに夜間営業の売店なし・飲料持込済',
  '03. 厳選した装備品\n―\n重ね着用のインナー（気温差対策）\n歩きやすい防水仕様のブーツ\n御朱印帳（善光寺用）\nカメラ 予備バッテリー2個\n現地の湧き水用タンブラー\nお土産用の折りたたみサブバッグ',
  '04. 食の確定ルート\n―\n初日昼：善光寺近くの戸隠そば（11:00並ぶ）\n二日目昼：松本城近くの馬刺し定食\n絶対食べる：おやき（野沢菜・ナス）\n名産：信州りんごのシードルを購入\n予算：食費と酒代で2.5万円\n備考：お蕎麦屋さんは現金のみ確認済み',
  '05. 巡る地点と動線\n―\nA：善光寺（お朝事・お戒壇巡り）\nB：長野県立美術館（東山魁夷館）\nC：松本城（天守閣登閣 待ち時間注意）\nD：縄手通り・中町通りの散策\n移動：長野〜松本間はワイドビューしなの\n雨天時：北斎館（小布施）へ変更',
  '06. 資金と決済の現状\n―\n現金：3万円（地方の蕎麦屋・バス用）\nメイン：QUICPay（Apple Pay）\n交通系：モバイルSuica 3000円分\nバス：長野市内のバス運賃確認済み\n上限：総額10万円（交通費込）\n領収書：お土産代は分けて保管',
  '07. 繋がる環境と設定\n―\n山間部の電波状況（オフラインマップ済）\n特急・新幹線の車内Wi-Fi活用\n緊急連絡先：宿泊先の電話番号\n写真バックアップ：夜にiCloudへ\n電池：低温時のバッテリー減りに注意\n設定：不要な通知を切って風景に集中',
  '08. 分刻みの初動プラン\n―\n08:30 駅構内で信州限定茶を購入\n09:00 発車（車内でルート最終確認）\n10:30 長野駅着・バスで善光寺へ\n11:00 早めの昼食（混雑回避）\n13:00 美術館で静かな時間を過ごす\n15:00 宿へ向けて移動開始',
  '09. 持ち帰る品と使命\n―\n自分へ：八幡屋礒五郎のカスタム七味\n友人へ：雷鳥の里（定番の安心感）\n家族へ：小布施の栗鹿ノ子\nミッション：静寂の中で深呼吸をする\nミッション：フィルムで山の稜線を撮る\n配送：重いリンゴや酒類は現地から発送',
];

export const TITLE_POSITIONS: { value: TitlePos; label: string }[] = [
  { value: 'top-left', label: '左上' },
  { value: 'top-center', label: '中央上' },
  { value: 'top-right', label: '右上' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-center', label: '中央下' },
  { value: 'bottom-right', label: '右下' },
];

export const GROUPS: { key: SizeGroup; label: string }[] = [
  { key: 'A', label: 'A 系' },
  { key: 'B', label: 'B 系（JIS）' },
  { key: 'card', label: '写真・はがき' },
  { key: 'book', label: '手帳' },
];

export const FONT_FAMILY = {
  sans: "'Noto Sans JP', sans-serif",
  serif: "'Noto Serif JP', serif",
} satisfies Record<FontType, string>;
