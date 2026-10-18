// States and Union Territories of India (English, Hindi, Marathi — Marathi names from the team's 1MV Marathi forms).
export const STATES = [
  ["andhra_pradesh", "Andhra Pradesh", "आंध्र प्रदेश", "आंध्र प्रदेश"], ["arunachal_pradesh", "Arunachal Pradesh", "अरुणाचल प्रदेश", "अरुणाचल प्रदेश"], ["assam", "Assam", "असम", "आसाम"],
  ["bihar", "Bihar", "बिहार", "बिहार"], ["chhattisgarh", "Chhattisgarh", "छत्तीसगढ़", "छत्तीसगड"], ["goa", "Goa", "गोवा", "गोवा"], ["gujarat", "Gujarat", "गुजरात", "गुजरात"],
  ["haryana", "Haryana", "हरियाणा", "हरियाणा"], ["himachal_pradesh", "Himachal Pradesh", "हिमाचल प्रदेश", "हिमाचल प्रदेश"], ["jharkhand", "Jharkhand", "झारखंड", "झारखंड"],
  ["karnataka", "Karnataka", "कर्नाटक", "कर्नाटक"], ["kerala", "Kerala", "केरल", "केरळ"], ["madhya_pradesh", "Madhya Pradesh", "मध्य प्रदेश", "मध्य प्रदेश"],
  ["maharashtra", "Maharashtra", "महाराष्ट्र", "महाराष्ट्र"], ["manipur", "Manipur", "मणिपुर", "मणिपूर"], ["meghalaya", "Meghalaya", "मेघालय", "मेघालय"], ["mizoram", "Mizoram", "मिज़ोरम", "मिझोराम"],
  ["nagaland", "Nagaland", "नागालैंड", "नागालँड"], ["odisha", "Odisha", "ओडिशा", "ओडिशा"], ["punjab", "Punjab", "पंजाब", "पंजाब"], ["rajasthan", "Rajasthan", "राजस्थान", "राजस्थान"],
  ["sikkim", "Sikkim", "सिक्किम", "सिक्कीम"], ["tamil_nadu", "Tamil Nadu", "तमिलनाडु", "तमिळनाडू"], ["telangana", "Telangana", "तेलंगाना", "तेलंगणा"], ["tripura", "Tripura", "त्रिपुरा", "त्रिपुरा"],
  ["uttar_pradesh", "Uttar Pradesh", "उत्तर प्रदेश", "उत्तर प्रदेश"], ["uttarakhand", "Uttarakhand", "उत्तराखंड", "उत्तराखंड"], ["west_bengal", "West Bengal", "पश्चिम बंगाल", "पश्चिम बंगाल"],
  ["andaman_nicobar", "Andaman and Nicobar Islands", "अंडमान और निकोबार द्वीप समूह", "अंदमान आणि निकोबार बेटे"], ["chandigarh", "Chandigarh", "चंडीगढ़", "चंदीगड"],
  ["dnh_dd", "Dadra and Nagar Haveli and Daman and Diu", "दादरा और नगर हवेली और दमन और दीव", "दादरा आणि नगर हवेली आणि दमण आणि दीव"], ["delhi", "Delhi", "दिल्ली", "दिल्ली"],
  ["jammu_kashmir", "Jammu and Kashmir", "जम्मू और कश्मीर", "जम्मू आणि काश्मीर"], ["ladakh", "Ladakh", "लद्दाख", "लडाख"], ["lakshadweep", "Lakshadweep", "लक्षद्वीप", "लक्षद्वीप"],
  ["puducherry", "Puducherry", "पुडुचेरी", "पुदुच्चेरी"],
].map(([v, en, hi, mr]) => ({ v, en, hi, mr }));
