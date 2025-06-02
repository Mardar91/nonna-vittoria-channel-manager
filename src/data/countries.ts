export interface Country {
  code: string;
  name: string;
}

export const COUNTRIES: Country[] = [
  { code: '100000301', name: 'افغانستان (Afghānistān)' }, // Dari/Pashto
  { code: '100000201', name: 'Shqipëri' },
  { code: '100000401', name: 'الجزائر (al-Jazā’ir)' }, // Arabo
  { code: '100000202', name: 'Andorra' }, // Catalano
  { code: '100000402', name: 'Angola' }, // Portoghese
  { code: '100000733', name: 'Anguilla' }, // Inglese
  { code: '100000503', name: 'Antigua and Barbuda' }, // Inglese
  { code: '100000999', name: 'APOLIDE' }, // Status, non una nazione
  { code: '100000302', name: 'المملكة العربية السعودية (al-Mamlaka al-ʿArabiyya as-Saʿūdiyya)' }, // Arabo
  { code: '100000602', name: 'Argentina' }, // Spagnolo
  { code: '100000358', name: 'Հայաստան (Hayastan)' },
  { code: '100000701', name: 'Australia' }, // Inglese
  { code: '100000203', name: 'Österreich' },
  { code: '100000359', name: 'Azərbaycan' },
  { code: '100000505', name: 'Bahamas' }, // Inglese
  { code: '100000304', name: 'البحرين (al-Baḥrayn)' }, // Arabo
  { code: '100000305', name: 'বাংলাদেশ (Bāṁlādesh)' },
  { code: '100000506', name: 'Barbados' }, // Inglese
  { code: '100000206', name: 'België / Belgique / Belgien' }, // Olandese/Francese/Tedesco
  { code: '100000507', name: 'Belize' }, // Inglese
  { code: '100000406', name: 'Bénin' }, // Francese
  { code: '100000739', name: 'Bermuda' }, // Inglese
  { code: '100000306', name: 'འབྲུག་ཡུལ་ (Druk Yul)' }, // Dzongkha
  { code: '100000256', name: 'Беларусь (Belarus)' },
  { code: '100000604', name: 'Bolivia / Wuliwya / Volívia / Buliwya' }, // Spagnolo/Quechua/Guaraní/Aymara
  { code: '100000740', name: 'Bophuthatswana' }, // Storico, Tswana/Inglese/Afrikaans
  { code: '100000252', name: 'Bosna i Hercegovina' }, // Bosniaco/Croato/Serbo
  { code: '100000408', name: 'Botswana' }, // Tswana/Inglese
  { code: '100000605', name: 'Brasil' }, // Portoghese
  { code: '100000309', name: 'Brunei Darussalam' }, // Malese
  { code: '100000209', name: 'България (Bǎlgariya)' },
  { code: '100000409', name: 'Burkina Faso' }, // Francese
  { code: '100000410', name: 'Burundi / Uburundi' }, // Francese/Kirundi
  { code: '100000310', name: 'កម្ពុជា (Kâmpŭchéa)' },
  { code: '100000411', name: 'Cameroun / Cameroon' }, // Francese/Inglese
  { code: '100000509', name: 'Canada' }, // Inglese/Francese
  { code: '100000413', name: 'Cabo Verde' }, // Portoghese
  { code: '100000742', name: 'Cayman Islands' }, // Inglese
  { code: '100000210', name: 'Československo' }, // Storico, Ceco/Slovacco
  { code: '100000743', name: 'Christmas Island' }, // Inglese
  { code: '100000415', name: 'Tchad / تشاد (Tshād)' }, // Francese/Arabo
  { code: '100000606', name: 'Chile' }, // Spagnolo
  { code: '100000314', name: '中国 (Zhōngguó)' },
  { code: '100000315', name: 'Κύπρος (Kýpros) / Kıbrıs' }, // Greco/Turco
  { code: '100000746', name: 'Cocos (Keeling) Islands' }, // Inglese/Malese delle Cocos
  { code: '100000608', name: 'Colombia' }, // Spagnolo
  { code: '100000417', name: 'جزر القمر (Juzur al-Qamar) / Comores / Komori' }, // Arabo/Francese/Comoriano
  { code: '100000418', name: 'Congo' }, // Francese (Rep. del Congo)
  { code: '100000319', name: '조선 (Chosŏn)' }, // Coreano (Nome spesso usato internamente per la Corea del Nord: 조선민주주의인민공화국)
  { code: '100000320', name: '한국 (Hanguk)' }, // Coreano (Nome spesso usato internamente per la Corea del Sud: 대한민국)
  { code: '100000404', name: 'Côte d\'Ivoire' }, // Francese
  { code: '100000513', name: 'Costa Rica' }, // Spagnolo
  { code: '100000250', name: 'Hrvatska' },
  { code: '100000514', name: 'Cuba' }, // Spagnolo
  { code: '100000212', name: 'Danmark' },
  { code: '100000515', name: 'Dominica' }, // Inglese
  { code: '100000609', name: 'Ecuador' }, // Spagnolo
  { code: '100000419', name: 'مصر (Miṣr)' }, // Arabo
  { code: '100000517', name: 'El Salvador' }, // Spagnolo
  { code: '100000322', name: 'الإمارات العربية المتحدة (al-ʾImārāt al-ʿArabiyya al-Muttaḥida)' }, // Arabo
  { code: '100000466', name: 'ኤርትራ (ʾErtrā) / إرتريا (Iritriyā)' }, // Tigrino/Arabo
  { code: '100000247', name: 'Eesti' },
  { code: '100000420', name: 'ኢትዮጵያ (ʾĪtyōṗṗyā)' }, // Amarico
  { code: '100000755', name: 'Føroyar / Færøerne' }, // Faroese/Danese
  { code: '100000245', name: 'Россия (Rossiya)' },
  { code: '100000703', name: 'Fiji / Viti' }, // Inglese/Figiano
  { code: '100000323', name: 'Pilipinas' }, // Filippino
  { code: '100000214', name: 'Suomi / Finland' }, // Finlandese/Svedese
  { code: '100000215', name: 'France' },
  { code: '100000421', name: 'Gabon' }, // Francese
  { code: '100000422', name: 'Gambia' }, // Inglese
  { code: '100000360', name: 'საქართველო (Sakartvelo)' },
  { code: '100000216', name: 'Deutschland' },
  { code: '100000423', name: 'Ghana' }, // Inglese
  { code: '100000518', name: 'Jamaica' }, // Inglese
  { code: '100000326', name: '日本 (Nihon / Nippon)' },
  { code: '100000424', name: 'Djibouti / جيبوتي (Jībūtī)' }, // Francese/Arabo
  { code: '100000327', name: 'الأردن (al-ʾUrdunn)' }, // Arabo
  { code: '100000220', name: 'Ελλάδα (Elláda)' },
  { code: '100000519', name: 'Grenada' }, // Inglese
  { code: '100000758', name: 'Kalaallit Nunaat / Grønland' }, // Groenlandese/Danese
  { code: '100000759', name: 'Guadeloupe' }, // Francese
  { code: '100000760', name: 'Guam / Guåhån' }, // Inglese/Chamorro
  { code: '100000523', name: 'Guatemala' }, // Spagnolo
  { code: '100000761', name: 'Guyane' }, // Francese (Guyana Francese)
  { code: '100000425', name: 'Guinée' }, // Francese
  { code: '100000426', name: 'Guiné-Bissau' }, // Portoghese
  { code: '100000427', name: 'Guinea Ecuatorial / Guinée équatoriale / Guiné Equatorial' }, // Spagnolo/Francese/Portoghese
  { code: '100000612', name: 'Guyana' }, // Inglese
  { code: '100000524', name: 'Haïti / Ayiti' }, // Francese/Creolo Haitiano
  { code: '100000525', name: 'Honduras' }, // Spagnolo
  { code: '110000005', name: '香港 (Hong Kong)' }, // Cinese (Cantonese)/Inglese
  { code: '100000330', name: 'भारत (Bhārat) / India' }, // Hindi/Inglese
  { code: '100000331', name: 'Indonesia' },
  { code: '100000332', name: 'ایران (Īrān)' }, // Persiano
  { code: '100000333', name: 'العراق (al-ʿIrāq)' }, // Arabo
  { code: '100000221', name: 'Éire / Ireland' }, // Irlandese/Inglese
  { code: '100000223', name: 'Ísland' },
  { code: '100000764', name: 'Virgin Islands' }, // Inglese (Presumibilmente U.S. Virgin Islands, vedi sotto per B.V.I.)
  { code: '100000334', name: 'ישראל (Yisraʾel) / إسرائيل (ʾIsrāʾīl)' }, // Ebraico/Arabo
  { code: '100000100', name: 'Italia' },
  { code: '100000356', name: 'Қазақстан (Qazaqstan) / Казахстан (Kazakhstan)' }, // Kazako/Russo
  { code: '100000428', name: 'Kenya' }, // Swahili/Inglese
  { code: '100000361', name: 'Кыргызстан (Kyrgyzstan)' }, // Kirghiso/Russo
  { code: '100000708', name: 'Kiribati' }, // Gilbertese/Inglese
  { code: '100001002', name: 'Kosovë / Косово (Kosovo)' }, // Albanese/Serbo
  { code: '100000335', name: 'الكويت (al-Kuwayt)' }, // Arabo
  { code: '100000765', name: 'La Réunion' }, // Francese
  { code: '100000336', name: 'ລາວ (Lao)' },
  { code: '100000429', name: 'Lesotho' }, // Sesotho/Inglese
  { code: '100000248', name: 'Latvija' },
  { code: '100000337', name: 'لبنان (Lubnān)' }, // Arabo
  { code: '100000430', name: 'Liberia' }, // Inglese
  { code: '100000431', name: 'ليبيا (Lībiyā)' }, // Arabo
  { code: '100000225', name: 'Liechtenstein' }, // Tedesco
  { code: '100000249', name: 'Lietuva' },
  { code: '100000226', name: 'Lëtzebuerg / Luxembourg / Luxemburg' }, // Lussemburghese/Francese/Tedesco
  { code: '110000003', name: '澳門 (Àomén) / Macau' }, // Cinese (Cantonese)/Portoghese
  { code: '100000253', name: 'Македонија (Makedonija)' }, // Macedone (Riferimento storico o geografico, vedi Macedonia del Nord)
  { code: '100000997', name: 'Северна Македонија (Severna Makedonija) / Maqedonia e Veriut' }, // Macedone/Albanese
  { code: '100000432', name: 'Madagasikara / Madagascar' }, // Malgascio/Francese
  { code: '100000434', name: 'Malawi' }, // Chewa/Inglese
  { code: '100000767', name: 'Malaysia' }, // Malese
  { code: '100000339', name: 'ދިވެހިރާއްޖެ (Dhivehi Raa\'je)' }, // Dhivehi
  { code: '100000435', name: 'Mali' }, // Francese
  { code: '100000227', name: 'Malta' }, // Maltese/Inglese
  { code: '100000768', name: 'Falkland Islands' }, // Inglese (Malvine è il nome italiano)
  { code: '100000769', name: 'Ellan Vannin / Isle of Man' }, // Mannese/Inglese
  { code: '100000436', name: 'المغرب (al-Maghrib)' }, // Arabo/Berbero
  { code: '100000772', name: 'Aorōkin M̧ajeļ / Marshall Islands' }, // Marshallese/Inglese
  { code: '100000773', name: 'Martinique' }, // Francese
  { code: '100000437', name: 'موريتانيا (Mūrītāniyā)' }, // Arabo
  { code: '100000438', name: 'Mauritius / Maurice / Moris' }, // Inglese/Francese/Creolo Mauriziano
  { code: '100000774', name: 'Mayotte' }, // Francese
  { code: '100000527', name: 'México' }, // Spagnolo
  { code: '100000775', name: 'Federated States of Micronesia' }, // Inglese
  { code: '100000254', name: 'Moldova' }, // Rumeno (Moldavo)
  { code: '100000229', name: 'Monaco' }, // Francese
  { code: '100000341', name: 'Монгол Улс (Mongol Uls)' },
  { code: '100001001', name: 'Crna Gora / Црна Гора' }, // Montenegrino
  { code: '100000777', name: 'Montserrat' }, // Inglese
  { code: '100000440', name: 'Moçambique' }, // Portoghese
  { code: '100000307', name: 'မြန်မာ (Myanma)' }, // Birmano
  { code: '100000441', name: 'Namibia' }, // Inglese
  { code: '100000715', name: 'Naoero / Nauru' }, // Nauruano/Inglese
  { code: '100000342', name: 'नेपाल (Nepāl)' },
  { code: '100000529', name: 'Nicaragua' }, // Spagnolo
  { code: '100000442', name: 'Niger' }, // Francese
  { code: '100000443', name: 'Nigeria' }, // Inglese
  { code: '100000778', name: 'Norf\'k Ailen / Norfolk Island' }, // Norfuk/Inglese
  { code: '100000231', name: 'Norge / Noreg' }, // Norvegese (Bokmål/Nynorsk)
  { code: '100000780', name: 'Nouvelle-Calédonie' }, // Francese
  { code: '100000719', name: 'Aotearoa / New Zealand' }, // Māori/Inglese
  { code: '100000343', name: 'عمان (ʿUmān)' }, // Arabo
  { code: '100000232', name: 'Nederland' },
  { code: '100000344', name: 'پاکستان (Pākistān)' }, // Urdu
  { code: '100000783', name: 'Belau / Palau' }, // Palauano/Inglese
  { code: '110000001', name: 'فلسطين (Filasṭīn)' }, // Arabo
  { code: '100000530', name: 'Panamá' }, // Spagnolo
  { code: '100000721', name: 'Papua Niugini / Papua New Guinea' }, // Tok Pisin/Inglese
  { code: '100000614', name: 'Paraguay / Paraguái' }, // Spagnolo/Guaraní
  { code: '100000615', name: 'Perú / Piruw' }, // Spagnolo/Quechua
  { code: '100000786', name: 'Pitkern Ailen / Pitcairn Islands' }, // Pitkern/Inglese
  { code: '100000787', name: 'Polynésie française' }, // Francese (Presumibilmente Polinesia Francese)
  { code: '100000233', name: 'Polska' },
  { code: '100000234', name: 'Portugal' },
  { code: '100000790', name: 'Puerto Rico' }, // Spagnolo/Inglese
  { code: '100000345', name: 'قطر (Qaṭar)' }, // Arabo
  { code: '100000219', name: 'United Kingdom' }, // Inglese
  { code: '100000257', name: 'Česká republika' },
  { code: '100000414', name: 'Ködörösêse tî Bêafrîka / République centrafricaine' }, // Sango/Francese
  { code: '100000998', name: 'République démocratique du Congo' }, // Francese
  { code: '100000516', name: 'República Dominicana' }, // Spagnolo
  { code: '100000255', name: 'Slovenská republika' },
  { code: '100000235', name: 'România' },
  { code: '100000446', name: 'Rwanda' }, // Kinyarwanda/Francese/Inglese
  { code: '100000534', name: 'Saint Kitts and Nevis' }, // Inglese
  { code: '100000533', name: 'Saint Vincent and the Grenadines' }, // Inglese
  { code: '100000795', name: 'الصحراء الغربية (aṣ-Ṣaḥrā’ al-Gharbiyyah)' }, // Arabo (Sahara Occidentale)
  { code: '100000532', name: 'Saint Lucia' }, // Inglese
  { code: '100000796', name: 'Saint-Pierre-et-Miquelon' }, // Francese
  { code: '100000797', name: 'Saint Vincent and the Grenadines' }, // Inglese (Duplicato, vedi sopra)
  { code: '100000725', name: 'Solomon Islands' }, // Inglese
  { code: '100000727', name: 'Sāmoa' }, // Samoano/Inglese
  { code: '100000798', name: 'American Samoa / Amerika Sāmoa' }, // Inglese/Samoano
  { code: '100000236', name: 'San Marino' }, // Italiano
  { code: '100000799', name: 'Saint Helena, Ascension and Tristan da Cunha' }, // Inglese
  { code: '100000448', name: 'São Tomé e Príncipe' }, // Portoghese
  { code: '100000450', name: 'Sénégal' }, // Francese
  { code: '100001000', name: 'Србија (Srbija)' },
  { code: '100000449', name: 'Seychelles / Sesel' }, // Inglese/Francese/Creolo Seychellese
  { code: '100000451', name: 'Sierra Leone' }, // Inglese
  { code: '100000346', name: 'Singapore / Singapura / 新加坡 / சிங்கப்பூர்' }, // Inglese/Malese/Mand./Tamil
  { code: '100000348', name: 'سوريا (Sūriyā)' }, // Arabo
  { code: '100000251', name: 'Slovenija' },
  { code: '100000453', name: 'Soomaaliya / الصومال (aṣ-Ṣūmāl)' }, // Somalo/Arabo
  { code: '100000239', name: 'España' },
  { code: '100000311', name: 'ශ්‍රී ලංකාව (Śrī Laṁkāva) / இலங்கை (Ilaṅkai)' }, // Singalese/Tamil
  { code: '100000536', name: 'United States of America' }, // Inglese
  { code: '100000246', name: 'Status Civitatis Vaticanæ / Stato della Città del Vaticano' }, // Latino/Italiano
  { code: '100000467', name: 'South Sudan' }, // Inglese
  { code: '100000454', name: 'Suid-Afrika / South Africa' }, // Afrikaans/Inglese (e altre 9 lingue ufficiali)
  { code: '100000455', name: 'السودان (as-Sūdān)' }, // Arabo
  { code: '100000616', name: 'Suriname' }, // Olandese
  { code: '100000240', name: 'Sverige' },
  { code: '100000241', name: 'Schweiz / Suisse / Svizzera / Svizra' }, // Tedesco/Francese/Italiano/Romancio
  { code: '100000456', name: 'eSwatini / Eswatini' }, // Swazi/Inglese (Nome moderno di Swaziland)
  { code: '100000362', name: 'Тоҷикистон (Tojikiston)' }, // Tagiko
  { code: '100000363', name: '臺灣 / 台灣 (Táiwān) / 中華民國 (Zhōnghuá Mínguó)' }, // Cinese Mandarino
  { code: '100000457', name: 'Tanzania' }, // Swahili/Inglese
  { code: '100000349', name: 'ประเทศไทย (Prathet Thai)' },
  { code: '100000805', name: 'Timor-Leste / Timór Lorosa\'e' }, // Portoghese/Tetum (Timor Est)
  { code: '100000458', name: 'Togo' }, // Francese
  { code: '100000806', name: 'Tokelau' }, // Tokelauano/Inglese
  { code: '100000730', name: 'Tonga' }, // Tongano/Inglese
  { code: '100000617', name: 'Trinidad and Tobago' }, // Inglese
  { code: '100000460', name: 'تونس (Tūnis)' }, // Arabo
  { code: '100000351', name: 'Türkiye' },
  { code: '100000364', name: 'Türkmenistan' },
  { code: '100000810', name: 'Turks and Caicos Islands' }, // Inglese
  { code: '100000731', name: 'Tuvalu' }, // Tuvaluano/Inglese
  { code: '100000243', name: 'Україна (Ukrayina)' },
  { code: '100000461', name: 'Uganda' }, // Inglese/Swahili
  { code: '100000244', name: 'Magyarország' },
  { code: '100000618', name: 'Uruguay' }, // Spagnolo
  { code: '100000357', name: 'O‘zbekiston' }, // Uzbeko
  { code: '100000732', name: 'Vanuatu' }, // Bislama/Inglese/Francese
  { code: '100000619', name: 'Venezuela' }, // Spagnolo
  { code: '100000812', name: 'British Virgin Islands' }, // Inglese
  { code: '100000353', name: 'Việt Nam' },
  { code: '100000815', name: 'Wallis-et-Futuna / Uvea mo Futuna' }, // Francese/Wallisiano/Futunano
  { code: '100000354', name: 'اليمن (al-Yaman)' }, // Arabo
  { code: '100000464', name: 'Zambia' }, // Inglese
  { code: '100000465', name: 'Zimbabwe' } // Inglese (e altre lingue ufficiali)
];
