const fs = require('fs');

let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Bulgarian,Outfit,120,&H00FFFFFF,&H0000D7FF,&H00000000,&H66000000,-1,0,0,0,100,100,0,0,1,6.5,2.5,8,100,100,1180,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

const posTag = `\\an8\\pos(540,1180)`;
const fsVal = 44;
const highlightColor = "&H00D7FF&";
const useAnim = `\\fad(150,0)\\t(0,100,\\fscx104\\fscy104)\\t(100,180,\\fscx100\\fscy100)`;

const formattedText = "В името на Аллах,\\NВсемилостивия, Милосърдния!";
const ayahStyleTag = `{${posTag}\\fs${fsVal}\\1c${highlightColor}${useAnim}}`;

ass += `Dialogue: 0,0:00:00.00,0:00:05.00,Bulgarian,,0,0,0,,${ayahStyleTag}${formattedText}\n`;

fs.writeFileSync('sub.ass', '\uFEFF' + ass, 'utf-8');
console.log("Created sub.ass");
