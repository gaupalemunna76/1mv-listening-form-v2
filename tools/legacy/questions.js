// 1MV Listening Form — questions for the three tools (Short Answer Focused version, 16 Oct 2026).
// Every piece of text is { en, hi, mr }. To add a language, add its code to LANGS (i18n.js) and a key
// with that code next to the others below; anything missing falls back to English.
// Hindi and Marathi are working drafts (Marathi follows the team's "Natural" style, तुम्ही):
// have native speakers review them before field use.
//
// Question fields
//   id        column name in the Sheet
//   type      short | para | number | choice | multi | dropdown
//   label     the question            hint   one-line example shown under it
//   options   [{ v, en, hi, mr }]     other  adds an "Other: ___" box (dropdown)
//   exclusive (multi) options that untick the others
//   required  must be answered before Next
//   showIf    (answers) => true/false — conditional question (asked only when true)
//   probe     follow-up for short answers: { minWords, vague: [...], ask, allowNoOne, allowChoice }
//             Asked once, when the answer is empty, a non-answer ("yes", "ok", "pata nahi"),
//             shorter than minWords, or only vague words.

import { STATES } from "./states.js";

const L = (en, hi, mr) => ({ en, hi, mr });
const opt = (v, en, hi, mr) => ({ v, en, hi, mr });
const stateOptions = STATES.map(s => opt(s.v, s.en, s.hi, s.mr));
const GENDER = [opt("female", "Female", "महिला", "स्त्री"), opt("male", "Male", "पुरुष", "पुरुष"), opt("other", "Other", "अन्य", "इतर"), opt("pnts", "Prefer not to say", "नहीं बताना चाहते", "सांगू इच्छित नाही")];

// Vague words seen in the pilot answers (Youth Q1, Q3, Q6; Parents P10, P15; Public Q5).
const VAGUE_LIFE = ["good", "happy", "peaceful", "peace", "settled", "nice", "better", "best", "success", "successful",
  "comfortable", "rich", "enjoy", "enjoyable", "easy", "smooth", "balanced", "balance", "independent", "life", "work", "job",
  "achha", "accha", "acha", "badhiya", "khush", "sukhi", "अच्छा", "अच्छी", "खुश", "सुखी", "शांत", "बढ़िया", "जीवन", "नौकरी",
  "चांगले", "चांगली", "चांगला", "आनंदी", "आयुष्य", "नोकरी", "समाधानी"];
const VAGUE_EFFORT = ["hard", "work", "study", "studying", "studies", "learn", "learning", "continuous", "knowledge", "skills",
  "skill", "practice", "more", "focus", "discipline", "mehnat", "padhai", "padhna", "मेहनत", "पढ़ाई", "पढ़ना", "सीखना", "ज्ञान",
  "अभ्यास", "कष्ट", "शिक्षण", "शिकणे", "कौशल्य"];
const VAGUE_SUPPORT = ["support", "help", "guidance", "guide", "motivation", "motivate", "encourage", "encouragement", "more",
  "better", "proper", "good", "sahyog", "madad", "सहयोग", "मदद", "मार्गदर्शन", "प्रेरणा", "मदत", "पाठिंबा", "प्रोत्साहन"];

// ---------------------------------------------------------------- YOUTH
const youthStudying = a => ["school", "college"].includes(a.Y5);

const YOUTH = {
  key: "youth",
  title: L("Youth: Your Future, Your Voice", "युवा: आपका भविष्य, आपकी आवाज़", "तरुण: तुमचे भविष्य, तुमचा आवाज"),
  intro: L("We want to hear how young people aged 12–25 see their future. There are no right or wrong answers. It takes about 8 minutes.",
           "हम जानना चाहते हैं कि 12–25 साल के युवा अपने भविष्य को कैसे देखते हैं। कोई जवाब सही या गलत नहीं है। इसमें लगभग 8 मिनट लगेंगे।",
           "१२–२५ वयोगटातील तरुण आपल्या भविष्याकडे कसे पाहतात, हे आम्हाला जाणून घ्यायचे आहे. यात कोणतेही उत्तर बरोबर किंवा चूक नाही. यासाठी साधारण ८ मिनिटे लागतील."),
  sections: [
    { id: "about", title: L("About you", "आपके बारे में", "तुमच्याबद्दल"), items: [
      { id: "Y1_age", type: "dropdown", required: true, label: L("How old are you?", "आपकी उम्र कितनी है?", "तुमचे वय किती आहे?"),
        options: [...Array.from({ length: 14 }, (_, i) => opt(String(12 + i), String(12 + i), String(12 + i), String(12 + i))), opt("26plus", "26 or older", "26 या उससे ज़्यादा", "२६ किंवा जास्त")] },
      { id: "Y2_gender", type: "choice", required: true, label: L("What is your gender?", "आपका लिंग क्या है?", "तुमचे लिंग कोणते?"), options: GENDER },
      { id: "Y3_state", type: "dropdown", required: true, label: L("Which state do you live in?", "आप किस राज्य में रहते हैं?", "तुम्ही कोणत्या राज्यात राहता?"), options: stateOptions },
      { id: "Y4_district", type: "short", required: true, label: L("Which district do you live in?", "आप किस ज़िले में रहते हैं?", "तुम्ही कोणत्या जिल्ह्यात राहता?") },
      { id: "Y5", type: "choice", required: true, label: L("What are you doing right now?", "अभी आप क्या कर रहे हैं?", "सध्या तुम्ही काय करत आहात?"),
        options: [opt("school", "In school", "स्कूल में पढ़ रहे हैं", "शाळेत शिकत आहे"), opt("college", "In college", "कॉलेज में पढ़ रहे हैं", "कॉलेजमध्ये शिकत आहे"),
          opt("exam", "Preparing for a competitive exam (e.g. government jobs)", "प्रतियोगी परीक्षा की तैयारी (जैसे सरकारी नौकरी)", "स्पर्धा परीक्षेची तयारी (उदा. सरकारी नोकरी)"),
          opt("working", "Working", "काम कर रहे हैं", "नोकरी / काम करत आहे"), opt("both", "Studying and working", "पढ़ाई और काम दोनों", "शिक्षण आणि काम दोन्ही"),
          opt("looking", "Looking for work", "काम ढूंढ रहे हैं", "कामाच्या शोधात आहे"), opt("none", "None of these right now", "अभी इनमें से कुछ नहीं", "सध्या यापैकी काहीच नाही")] },
      { id: "Y6_class", type: "dropdown", required: true, showIf: youthStudying,
        label: L("Which class or course are you in?", "आप किस कक्षा या कोर्स में हैं?", "तुम्ही कितवीत आहात / कोणता कोर्स करत आहात?"),
        options: [opt("c6_8", "Class 6–8", "कक्षा 6–8", "इयत्ता ६–८"), opt("c9_10", "Class 9–10", "कक्षा 9–10", "इयत्ता ९–१०"), opt("c11_12", "Class 11–12", "कक्षा 11–12", "इयत्ता ११–१२"),
          opt("arts", "College: Arts", "कॉलेज: आर्ट्स", "कॉलेज: कला (आर्ट्स)"), opt("science", "College: Science", "कॉलेज: साइंस", "कॉलेज: विज्ञान"), opt("commerce", "College: Commerce", "कॉलेज: कॉमर्स", "कॉलेज: वाणिज्य"),
          opt("engg", "College: Engineering", "कॉलेज: इंजीनियरिंग", "कॉलेज: अभियांत्रिकी"), opt("iti", "ITI or vocational", "आईटीआई या व्यावसायिक", "आयटीआय किंवा व्यावसायिक"),
          opt("pg", "Postgraduate", "स्नातकोत्तर (PG)", "पदव्युत्तर (PG)"), opt("other", "Other", "अन्य", "इतर")] },
      { id: "Y7_institution", type: "choice", required: true,
        label: L("What type of school or college are you in now, or were you in last?", "आप अभी किस तरह के स्कूल या कॉलेज में हैं, या आखिरी बार किसमें थे?", "तुम्ही सध्या कोणत्या प्रकारच्या शाळेत/कॉलेजमध्ये आहात, किंवा शेवटी कोणत्या होतात?"),
        options: [opt("govt", "Government", "सरकारी", "सरकारी"), opt("aided", "Government-aided", "सरकारी सहायता प्राप्त", "सरकारी अनुदानित"), opt("private", "Private", "प्राइवेट", "खासगी"),
          opt("nios", "Open school (NIOS)", "ओपन स्कूल (NIOS)", "मुक्त शाळा (NIOS)"), opt("notsure", "Not sure", "पता नहीं", "नक्की माहीत नाही")] },
      { id: "Y8_income", type: "choice", required: true, label: L("What is your family's total income in a year?", "आपके परिवार की साल भर की कुल आमदनी कितनी है?", "तुमच्या कुटुंबाचे वर्षाचे एकूण उत्पन्न किती आहे?"),
        options: [opt("lt3", "Less than ₹3 lakh", "₹3 लाख से कम", "₹३ लाखांपेक्षा कमी"), opt("3to8", "₹3–8 lakh", "₹3–8 लाख", "₹३–८ लाख"), opt("8to10", "₹8–10 lakh", "₹8–10 लाख", "₹८–१० लाख"),
          opt("gt10", "More than ₹10 lakh", "₹10 लाख से ज़्यादा", "₹१० लाखांपेक्षा जास्त"), opt("dk", "I don't know", "मुझे नहीं पता", "मला माहीत नाही")] },
      { id: "Y9_disability", type: "multi", required: true, exclusive: ["no", "pnts"],
        label: L("Do you have a disability? Tick any that apply.", "क्या आपको कोई दिव्यांगता है? जो लागू हों, उन पर निशान लगाएँ।", "तुम्हाला कोणते अपंगत्व आहे का? लागू असतील ते सर्व निवडा."),
        options: [opt("no", "No", "नहीं", "नाही"), opt("moving", "Difficulty walking or moving", "चलने-फिरने में कठिनाई", "चालण्या-फिरण्यात अडचण"), opt("seeing", "Difficulty seeing", "देखने में कठिनाई", "पाहण्यात अडचण"),
          opt("hearing", "Difficulty hearing or speaking", "सुनने या बोलने में कठिनाई", "ऐकण्यात किंवा बोलण्यात अडचण"), opt("learning", "Difficulty learning or remembering", "सीखने या याद रखने में कठिनाई", "शिकण्यात किंवा लक्षात ठेवण्यात अडचण"),
          opt("other", "Other", "अन्य", "इतर"), opt("pnts", "Prefer not to say", "नहीं बताना चाहते", "सांगू इच्छित नाही")] },
    ] },
    { id: "future", title: L("Your future", "आपका भविष्य", "तुमचे भविष्य"), items: [
      { id: "Y11a_work", type: "short", label: L("When you are 30, what work do you want to be doing?", "जब आप 30 साल के होंगे, तब आप क्या काम करना चाहेंगे?", "तुम्ही ३० वर्षांचे असाल तेव्हा तुम्हाला कोणते काम करायला आवडेल?"),
        hint: L("Example: Running my own tailoring shop with two helpers.", "उदाहरण: दो सहायकों के साथ अपनी सिलाई की दुकान चलाना।", "उदाहरण: दोन मदतनिसांसोबत माझे स्वतःचे शिलाईचे दुकान चालवणे."),
        probe: { minWords: 4, vague: VAGUE_LIFE, ask: L("Tell us a little more: what exactly would you do, and where?", "थोड़ा और बताइए: आप ठीक-ठीक क्या काम करेंगे, और कहाँ?", "थोडे अधिक सांगा: तुम्ही नेमके कोणते काम कराल, आणि कुठे?") } },
      { id: "Y11b_life", type: "short", label: L("When you are 30, where and how do you want to live?", "जब आप 30 साल के होंगे, तब आप कहाँ और कैसे रहना चाहेंगे?", "तुम्ही ३० वर्षांचे असाल तेव्हा तुम्हाला कुठे आणि कसे राहायला आवडेल?"),
        hint: L("Example: In my own house in Gaya, near my parents, with enough money to travel once a year.", "उदाहरण: गया में अपने घर में, माता-पिता के पास, और इतने पैसे हों कि साल में एक बार घूमने जा सकूँ।", "उदाहरण: पुण्यात माझ्या स्वतःच्या घरात, आई-वडिलांच्या जवळ, आणि वर्षातून एकदा फिरायला जाता येईल इतके पैसे असावेत."),
        probe: { minWords: 5, vague: VAGUE_LIFE, ask: L("Can you describe it a bit more? For example: which place, who lives with you, what your home is like.", "क्या आप थोड़ा और बता सकते हैं? जैसे: कौन सी जगह, आपके साथ कौन रहेगा, आपका घर कैसा होगा।", "थोडे अधिक सांगू शकाल का? उदा.: कोणते ठिकाण, तुमच्यासोबत कोण राहील, तुमचे घर कसे असेल.") } },
      { id: "Y12_sure", type: "choice", required: true, label: L("How sure are you that you will reach this future?", "आपको कितना भरोसा है कि आप यह भविष्य पा लेंगे?", "हे भविष्य तुम्ही गाठू शकाल, याची तुम्हाला किती खात्री आहे?"),
        options: [opt("very", "Very sure", "बहुत भरोसा है", "खूप खात्री आहे"), opt("quite", "Quite sure", "काफ़ी भरोसा है", "बऱ्यापैकी खात्री आहे"), opt("unsure", "A little unsure", "थोड़ा शक है", "थोडी शंका आहे"), opt("notsure", "Not sure at all", "बिल्कुल भरोसा नहीं", "अजिबात खात्री नाही")] },
      { id: "Y12_reason", type: "short", label: L("What is the main reason you feel this way?", "आप ऐसा क्यों महसूस करते हैं? मुख्य कारण क्या है?", "तुम्हाला असे का वाटते? मुख्य कारण कोणते?"),
        hint: L("Example: My family supports my studies, but I worry about paying college fees.", "उदाहरण: मेरा परिवार मेरी पढ़ाई में साथ देता है, लेकिन मुझे कॉलेज की फ़ीस की चिंता है।", "उदाहरण: माझे कुटुंब माझ्या शिक्षणाला पाठिंबा देते, पण कॉलेजच्या फीची मला काळजी वाटते."),
        probe: { minWords: 4, ask: L("What makes you feel this way? Even one reason helps.", "आपको ऐसा क्यों लगता है? एक कारण भी काफ़ी है।", "तुम्हाला असे का वाटते? एक कारणही पुरेसे आहे.") } },
      { id: "Y13_skills", type: "short", label: L("Name 2 skills you need to learn to reach this future.", "इस भविष्य तक पहुँचने के लिए आपको कौन से 2 हुनर सीखने होंगे? उनके नाम लिखिए।", "हे भविष्य गाठण्यासाठी तुम्हाला कोणती २ कौशल्ये शिकावी लागतील? त्यांची नावे सांगा."),
        hint: L("Example: Spoken English and using Excel on a computer.", "उदाहरण: अंग्रेज़ी बोलना और कंप्यूटर पर एक्सेल चलाना।", "उदाहरण: इंग्रजी बोलणे आणि संगणकावर एक्सेल वापरणे."),
        probe: { minWords: 3, vague: VAGUE_EFFORT, ask: L("Which specific skills? For example: typing, spoken English, driving, tailoring, coding.", "कौन से खास हुनर? जैसे: टाइपिंग, अंग्रेज़ी बोलना, गाड़ी चलाना, सिलाई, कोडिंग।", "नेमकी कोणती कौशल्ये? उदा.: टायपिंग, इंग्रजी बोलणे, गाडी चालवणे, शिलाई, कोडिंग.") } },
    ] },
    { id: "learning", title: L("Learning and support", "सीखना और सहारा", "शिकणे आणि आधार"), items: [
      { id: "Y14_now", type: "choice", required: true, label: L("Are you able to learn these skills right now?", "क्या आप ये हुनर अभी सीख पा रहे हैं?", "ही कौशल्ये तुम्ही सध्या शिकू शकत आहात का?"),
        options: [opt("yes", "Yes, regularly", "हाँ, नियमित रूप से", "हो, नियमितपणे"), opt("sometimes", "Sometimes", "कभी-कभी", "कधी कधी"), opt("notyet", "Not yet", "अभी नहीं", "अजून नाही")] },
      { id: "Y14_where", type: "short", showIf: a => ["yes", "sometimes"].includes(a.Y14_now),
        label: L("Where or how are you learning them?", "आप इन्हें कहाँ या कैसे सीख रहे हैं?", "तुम्ही ती कुठे किंवा कशी शिकत आहात?"),
        hint: L("Example: At my ITI, and from YouTube videos at home.", "उदाहरण: अपने आईटीआई में, और घर पर यूट्यूब वीडियो से।", "उदाहरण: माझ्या आयटीआयमध्ये, आणि घरी यूट्यूब व्हिडिओंमधून."),
        probe: { minWords: 3, ask: L("Please name the place, person or app where you learn.", "कृपया वह जगह, व्यक्ति या ऐप बताइए जहाँ से आप सीखते हैं।", "तुम्ही जिथून शिकता ते ठिकाण, व्यक्ती किंवा ॲप सांगा.") } },
      { id: "Y14_stop", type: "short", showIf: a => a.Y14_now === "notyet",
        label: L("What is stopping you from learning them now?", "आपको अभी इन्हें सीखने से क्या रोक रहा है?", "ती आत्ता शिकण्यात तुम्हाला काय अडचण येत आहे?"),
        hint: L("Example: There is no coaching centre near my village.", "उदाहरण: मेरे गाँव के पास कोई कोचिंग सेंटर नहीं है।", "उदाहरण: माझ्या गावाजवळ कोणतेही कोचिंग सेंटर नाही."),
        probe: { minWords: 3, ask: L("What gets in the way? For example: money, distance, time, no one to teach.", "क्या रुकावट है? जैसे: पैसा, दूरी, समय, सिखाने वाला कोई नहीं।", "नेमकी अडचण कोणती? उदा.: पैसे, अंतर, वेळ, शिकवणारे कोणी नाही.") } },
      { id: "Y15_helped", type: "short", label: L("Who or what has helped you most to learn these skills, and how?", "इन हुनरों को सीखने में किसने या किस चीज़ ने आपकी सबसे ज़्यादा मदद की, और कैसे?", "ही कौशल्ये शिकायला तुम्हाला सर्वात जास्त मदत कोणी किंवा कशाने केली, आणि कशी?"),
        hint: L("Example: My senior in college showed me how to prepare for interviews.", "उदाहरण: कॉलेज में मेरे सीनियर ने मुझे इंटरव्यू की तैयारी करना सिखाया।", "उदाहरण: कॉलेजमधील माझ्या सीनियरने मला मुलाखतीची तयारी कशी करायची ते शिकवले."),
        probe: { minWords: 4, ask: L("Who was it, and what did they do for you?", "वह कौन था, और उन्होंने आपके लिए क्या किया?", "ते कोण होते, आणि त्यांनी तुमच्यासाठी काय केले?") } },
      { id: "Y16_onething", type: "short", label: L("If your school, college or family could do ONE new thing to help you, what should it be?", "अगर आपका स्कूल, कॉलेज या परिवार आपकी मदद के लिए एक नई चीज़ कर सके, तो वह क्या होनी चाहिए?", "तुमची शाळा, कॉलेज किंवा कुटुंब तुमच्या मदतीसाठी एक नवी गोष्ट करू शकले, तर ती कोणती असावी?"),
        hint: L("Example: Invite people from different jobs to talk to us about their work.", "उदाहरण: अलग-अलग काम करने वाले लोगों को बुलाएँ जो हमें अपने काम के बारे में बताएँ।", "उदाहरण: वेगवेगळी कामे करणाऱ्या लोकांना बोलवावे, जे आम्हाला त्यांच्या कामाबद्दल सांगतील."),
        probe: { minWords: 4, vague: VAGUE_SUPPORT, ask: L("What exactly should they do? Try to describe one concrete thing.", "उन्हें ठीक-ठीक क्या करना चाहिए? कोई एक ठोस चीज़ बताइए।", "त्यांनी नेमके काय करावे? एखादी ठोस गोष्ट सांगा.") } },
      { id: "Y17_asked", type: "short", label: L("Who did you last ask about your future, and what did you ask them? (If no one, write \"no one\".)", "अपने भविष्य के बारे में आपने आखिरी बार किससे पूछा था, और क्या पूछा था? (अगर किसी से नहीं, तो \"किसी से नहीं\" लिखें।)", "तुमच्या भविष्याबद्दल तुम्ही शेवटचे कोणाला विचारले होते, आणि काय विचारले होते? (कोणालाच नसेल, तर \"कोणालाच नाही\" लिहा.)"),
        hint: L("Example: My cousin – which course to take after Class 12.", "उदाहरण: मेरे चचेरे भाई से – 12वीं के बाद कौन सा कोर्स लूँ।", "उदाहरण: माझ्या चुलत भावाला – बारावीनंतर कोणता कोर्स घ्यावा."),
        probe: { minWords: 3, allowNoOne: true, ask: L("Who was it (for example a parent, teacher, friend) and what was it about?", "वह कौन था (जैसे माता-पिता, शिक्षक, दोस्त) और बात किस बारे में थी?", "ते कोण होते (उदा. आई-वडील, शिक्षक, मित्र) आणि कशाबद्दल बोललात?") } },
      { id: "Y18_mydo", type: "short", label: L("What is one thing YOU would like to do to help other young people learn?", "दूसरे युवाओं को सीखने में मदद के लिए आप खुद कौन सी एक चीज़ करना चाहेंगे?", "इतर तरुणांना शिकायला मदत करण्यासाठी तुम्ही स्वतः कोणती एक गोष्ट करायला आवडेल?"),
        hint: L("Example: Teach English to children in my village on Sundays.", "उदाहरण: रविवार को अपने गाँव के बच्चों को अंग्रेज़ी पढ़ाना।", "उदाहरण: रविवारी माझ्या गावातील मुलांना इंग्रजी शिकवणे."),
        probe: { minWords: 4, vague: VAGUE_SUPPORT, ask: L("What would you actually do, and for whom?", "आप असल में क्या करेंगे, और किसके लिए?", "तुम्ही प्रत्यक्षात काय कराल, आणि कोणासाठी?") } },
    ] },
  ],
};

// ---------------------------------------------------------------- PARENTS
const PARENT = {
  key: "parent",
  title: L("Parents: Your Child's School and Future", "अभिभावक: आपके बच्चे का स्कूल और भविष्य", "पालक: तुमच्या मुलाची शाळा आणि भविष्य"),
  intro: L("We want to hear from parents about their child's school and future. There are no right or wrong answers. It takes about 8 minutes.",
           "हम अभिभावकों से उनके बच्चे के स्कूल और भविष्य के बारे में सुनना चाहते हैं। कोई जवाब सही या गलत नहीं है। इसमें लगभग 8 मिनट लगेंगे।",
           "पालकांकडून त्यांच्या मुलाच्या शाळेबद्दल आणि भविष्याबद्दल आम्हाला ऐकायचे आहे. यात कोणतेही उत्तर बरोबर किंवा चूक नाही. यासाठी साधारण ८ मिनिटे लागतील."),
  sections: [
    { id: "about", title: L("About you and your child", "आपके और आपके बच्चे के बारे में", "तुमच्याबद्दल आणि तुमच्या मुलाबद्दल"),
      note: L("If you have more than one child, answer for your eldest child who is still studying.", "अगर आपके एक से ज़्यादा बच्चे हैं, तो अपने सबसे बड़े पढ़ रहे बच्चे के बारे में जवाब दें।", "तुम्हाला एकापेक्षा जास्त मुले असतील, तर अजूनही शिकत असलेल्या सर्वात मोठ्या मुलाबद्दल उत्तर द्या."),
      items: [
      { id: "P1_state", type: "dropdown", required: true, label: L("Which state do you live in?", "आप किस राज्य में रहते हैं?", "तुम्ही कोणत्या राज्यात राहता?"), options: stateOptions },
      { id: "P2_district", type: "short", required: true, label: L("In which district is your child's school?", "आपके बच्चे का स्कूल किस ज़िले में है?", "तुमच्या मुलाची शाळा कोणत्या जिल्ह्यात आहे?") },
      { id: "P3_relation", type: "choice", required: true, label: L("You are the child's:", "आप बच्चे के क्या लगते हैं?", "तुम्ही मुलाचे कोण आहात?"),
        options: [opt("mother", "Mother", "माँ", "आई"), opt("father", "Father", "पिता", "वडील"), opt("grandparent", "Grandparent", "दादा-दादी / नाना-नानी", "आजी-आजोबा"), opt("guardian", "Other guardian", "अन्य अभिभावक", "इतर पालक")] },
      { id: "P4_school", type: "choice", required: true, label: L("Your child's school or college is:", "आपके बच्चे का स्कूल या कॉलेज:", "तुमच्या मुलाची शाळा किंवा कॉलेज:"),
        options: [opt("govt", "Government", "सरकारी", "सरकारी"), opt("aided", "Government-aided", "सरकारी सहायता प्राप्त", "सरकारी अनुदानित"), opt("private", "Private", "प्राइवेट", "खासगी"), opt("notsure", "Not sure", "पता नहीं", "नक्की माहीत नाही")] },
      { id: "P5_class", type: "dropdown", required: true, label: L("Which class is your child in?", "आपका बच्चा किस कक्षा में है?", "तुमचे मूल कितवीत आहे?"),
        options: [opt("pre", "Nursery–UKG", "नर्सरी–यूकेजी", "नर्सरी–मोठा गट"), opt("c1_5", "Class 1–5", "कक्षा 1–5", "इयत्ता १–५"), opt("c6_8", "Class 6–8", "कक्षा 6–8", "इयत्ता ६–८"), opt("c9_10", "Class 9–10", "कक्षा 9–10", "इयत्ता ९–१०"),
          opt("c11_12", "Class 11–12", "कक्षा 11–12", "इयत्ता ११–१२"), opt("college", "College", "कॉलेज", "कॉलेज"), opt("done", "Finished studies", "पढ़ाई पूरी कर ली", "शिक्षण पूर्ण झाले")] },
      { id: "P6_ownedu", type: "choice", required: true, label: L("Up to which level did you study?", "आपने कहाँ तक पढ़ाई की है?", "तुम्ही कितवीपर्यंत शिकलात?"),
        options: [opt("none", "Did not go to school", "स्कूल नहीं गए", "शाळेत गेलो नाही"), opt("c1_5", "Class 1–5", "कक्षा 1–5", "इयत्ता १–५"), opt("c6_8", "Class 6–8", "कक्षा 6–8", "इयत्ता ६–८"), opt("c9_10", "Class 9–10", "कक्षा 9–10", "इयत्ता ९–१०"),
          opt("c11_12", "Class 11–12", "कक्षा 11–12", "इयत्ता ११–१२"), opt("grad", "Graduate", "स्नातक", "पदवीधर"), opt("pg", "Postgraduate or more", "स्नातकोत्तर या उससे ज़्यादा", "पदव्युत्तर किंवा जास्त")] },
    ] },
    { id: "school", title: L("School and learning", "स्कूल और पढ़ाई", "शाळा आणि शिक्षण"), items: [
      { id: "P7_visits", type: "choice", required: true, label: L("In the last 6 months, how many times did you go to your child's school?", "पिछले 6 महीनों में आप अपने बच्चे के स्कूल कितनी बार गए?", "गेल्या ६ महिन्यांत तुम्ही मुलाच्या शाळेत किती वेळा गेलात?"),
        options: [opt("0", "Not at all", "एक बार भी नहीं", "एकदाही नाही"), opt("1_2", "1–2 times", "1–2 बार", "१–२ वेळा"), opt("3_5", "3–5 times", "3–5 बार", "३–५ वेळा"), opt("6plus", "6 times or more", "6 बार या ज़्यादा", "६ किंवा जास्त वेळा")] },
      { id: "P8_reason", type: "short", showIf: a => a.P7_visits && a.P7_visits !== "0",
        label: L("What was the main reason for your last visit to the school?", "पिछली बार स्कूल जाने का मुख्य कारण क्या था?", "मागच्या वेळी शाळेत जाण्याचे मुख्य कारण काय होते?"),
        hint: L("Example: A parent-teacher meeting about her half-yearly results.", "उदाहरण: उसके छमाही परीक्षा के नतीजों पर अभिभावक-शिक्षक बैठक।", "उदाहरण: तिच्या सहामाही निकालाबद्दल पालक-शिक्षक सभा."),
        probe: { minWords: 3, ask: L("What was the meeting or visit about?", "वह बैठक या मुलाक़ात किस बारे में थी?", "ती सभा किंवा भेट कशाबद्दल होती?") } },
      { id: "P8_notvisit", type: "short", showIf: a => a.P7_visits === "0",
        label: L("What makes it hard to visit your child's school?", "बच्चे के स्कूल जाने में क्या मुश्किल आती है?", "मुलाच्या शाळेत जाण्यात काय अडचण येते?"),
        hint: L("Example: I work on daily wages and the meetings are during work hours.", "उदाहरण: मैं दिहाड़ी पर काम करता हूँ और बैठकें काम के समय होती हैं।", "उदाहरण: मी रोजंदारीवर काम करतो आणि सभा कामाच्या वेळेत असतात."),
        probe: { minWords: 3, ask: L("Even one reason helps: time, distance, not invited, or something else?", "एक कारण भी काफ़ी है: समय, दूरी, बुलाया नहीं गया, या कुछ और?", "एक कारणही पुरेसे आहे: वेळ, अंतर, बोलावले नाही, की आणखी काही?") } },
      { id: "P9_happy", type: "choice", required: true, label: L("How happy are you with your child's learning?", "आप अपने बच्चे की पढ़ाई से कितने संतुष्ट हैं?", "मुलाच्या शिक्षणाबद्दल तुम्ही किती समाधानी आहात?"),
        options: [opt("very", "Very happy", "बहुत संतुष्ट", "खूप समाधानी"), opt("happy", "Happy", "संतुष्ट", "समाधानी"), opt("notvery", "Not very happy", "ज़्यादा संतुष्ट नहीं", "फारसे समाधानी नाही"), opt("not", "Not happy", "संतुष्ट नहीं", "समाधानी नाही")] },
      { id: "P9_reason", type: "short", label: L("What is one reason you feel this way?", "आप ऐसा क्यों महसूस करते हैं? एक कारण बताइए।", "तुम्हाला असे का वाटते? एक कारण सांगा."),
        hint: L("Example: She now reads Hindi storybooks on her own.", "उदाहरण: वह अब खुद हिंदी की कहानियों की किताबें पढ़ लेती है।", "उदाहरण: ती आता स्वतः मराठी गोष्टींची पुस्तके वाचते."),
        probe: { minWords: 4, vague: VAGUE_LIFE, ask: L("What have you noticed about your child's learning that makes you feel this way?", "बच्चे की पढ़ाई में आपने ऐसा क्या देखा जिससे आपको ऐसा लगता है?", "मुलाच्या शिक्षणात तुम्ही असे काय पाहिले, ज्यामुळे तुम्हाला असे वाटते?") } },
      { id: "P11_change", type: "short", label: L("Name 2 things you would change first in your child's school.", "अपने बच्चे के स्कूल में आप सबसे पहले कौन सी 2 चीज़ें बदलना चाहेंगे?", "मुलाच्या शाळेत तुम्ही सर्वात आधी कोणत्या २ गोष्टी बदलाल?"),
        hint: L("Example: More regular teachers and a computer class.", "उदाहरण: नियमित आने वाले ज़्यादा शिक्षक और कंप्यूटर की कक्षा।", "उदाहरण: नियमित येणारे जास्त शिक्षक आणि संगणकाचा वर्ग."),
        probe: { minWords: 4, vague: ["good", "study", "studies", "education", "teaching", "better", "achhi", "padhai", "अच्छी", "पढ़ाई", "शिक्षा", "चांगले", "अभ्यास", "शिक्षण"],
          ask: L("Which exact things? For example: teachers, toilets, water, books, computers, sports.", "कौन सी खास चीज़ें? जैसे: शिक्षक, शौचालय, पानी, किताबें, कंप्यूटर, खेल।", "नेमक्या कोणत्या गोष्टी? उदा.: शिक्षक, स्वच्छतागृहे, पाणी, पुस्तके, संगणक, खेळ.") } },
      { id: "P12_safe", type: "short", label: L("What one thing would make your child feel safer at school?", "कौन सी एक चीज़ आपके बच्चे को स्कूल में ज़्यादा सुरक्षित महसूस कराएगी?", "कोणत्या एका गोष्टीमुळे तुमच्या मुलाला शाळेत अधिक सुरक्षित वाटेल?"),
        hint: L("Example: A boundary wall and a lady teacher in every class.", "उदाहरण: चारदीवारी और हर कक्षा में एक महिला शिक्षिका।", "उदाहरण: संरक्षक भिंत आणि प्रत्येक वर्गात एक शिक्षिका."),
        probe: { minWords: 3, ask: L("What would help most: the building, teachers, other children, or the way to school?", "सबसे ज़्यादा क्या मदद करेगा: भवन, शिक्षक, दूसरे बच्चे, या स्कूल आने-जाने का रास्ता?", "सर्वात जास्त कशाने मदत होईल: इमारत, शिक्षक, इतर मुले, की शाळेत येण्या-जाण्याचा रस्ता?") } },
    ] },
    { id: "home", title: L("Home and future", "घर और भविष्य", "घर आणि भविष्य"), items: [
      { id: "P13_lastweek", type: "short", label: L("What did you do last week to help your child with studies?", "पिछले हफ़्ते आपने बच्चे की पढ़ाई में मदद के लिए क्या किया?", "मागच्या आठवड्यात मुलाच्या अभ्यासात मदत करण्यासाठी तुम्ही काय केले?"),
        hint: L("Example: Checked his homework each evening and asked what he learned.", "उदाहरण: हर शाम उसका होमवर्क देखा और पूछा कि उसने क्या सीखा।", "उदाहरण: रोज संध्याकाळी त्याचा गृहपाठ पाहिला आणि त्याने काय शिकले ते विचारले."),
        probe: { minWords: 3, allowNoOne: true, ask: L("Anything at all counts, even asking about school. If nothing, you can write \"nothing this week\".", "कुछ भी गिना जाएगा, स्कूल के बारे में पूछना भी। अगर कुछ नहीं, तो \"इस हफ़्ते कुछ नहीं\" लिख सकते हैं।", "कोणतीही गोष्ट चालेल, शाळेबद्दल विचारणेसुद्धा. काहीच नसेल, तर \"या आठवड्यात काही नाही\" असे लिहू शकता.") } },
      { id: "P14_ease", type: "choice", required: true, label: L("Helping my child with studies at home is:", "घर पर बच्चे की पढ़ाई में मदद करना मेरे लिए:", "घरी मुलाच्या अभ्यासात मदत करणे माझ्यासाठी:"),
        options: [opt("easy", "Easy", "आसान है", "सोपे आहे"), opt("sometimes", "Sometimes hard", "कभी-कभी मुश्किल है", "कधी कधी अवघड आहे"), opt("hard", "Hard", "मुश्किल है", "अवघड आहे")] },
      { id: "P14_why", type: "short", label: L("What makes it easy or hard for you?", "आपके लिए यह आसान या मुश्किल क्यों है?", "तुमच्यासाठी ते सोपे किंवा अवघड का आहे?"),
        hint: L("Example: I studied only till Class 5, so maths homework is hard for me.", "उदाहरण: मैंने सिर्फ़ 5वीं तक पढ़ाई की है, इसलिए गणित का होमवर्क मेरे लिए मुश्किल है।", "उदाहरण: मी फक्त पाचवीपर्यंत शिकलो, त्यामुळे गणिताचा गृहपाठ मला अवघड जातो."),
        probe: { minWords: 4, ask: L("Could you share the main reason? For example: time, your own schooling, cost, or the syllabus.", "मुख्य कारण बताइए? जैसे: समय, आपकी अपनी पढ़ाई, खर्च, या सिलेबस।", "मुख्य कारण सांगाल का? उदा.: वेळ, तुमचे स्वतःचे शिक्षण, खर्च, की अभ्यासक्रम.") } },
      { id: "P10_work", type: "short", label: L("What work do you hope your child will do when they grow up? (You can also write \"whatever my child chooses\".)", "बड़े होकर आपका बच्चा कौन सा काम करे, ऐसी आपकी उम्मीद है? (आप \"जो बच्चा खुद चुने\" भी लिख सकते हैं।)", "मोठे झाल्यावर तुमच्या मुलाने कोणते काम करावे, असे तुम्हाला वाटते? (\"मूल स्वतः ठरवेल ते\" असेही लिहू शकता.)"),
        hint: L("Example: A government job as a nurse.", "उदाहरण: नर्स की सरकारी नौकरी।", "उदाहरण: परिचारिकेची (नर्स) सरकारी नोकरी."),
        probe: { minWords: 3, vague: VAGUE_LIFE, allowChoice: true, ask: L("Which kind of work? For example: teacher, police, own business, farming, nurse.", "किस तरह का काम? जैसे: शिक्षक, पुलिस, अपना व्यवसाय, खेती, नर्स।", "कोणत्या प्रकारचे काम? उदा.: शिक्षक, पोलीस, स्वतःचा व्यवसाय, शेती, नर्स.") } },
      { id: "P10_life", type: "short", label: L("What kind of life do you wish for your child?", "आप अपने बच्चे के लिए कैसी ज़िंदगी चाहते हैं?", "तुम्हाला तुमच्या मुलासाठी कसे आयुष्य हवे आहे?"),
        hint: L("Example: A settled life near the family, with no money worries.", "उदाहरण: परिवार के पास बसी हुई ज़िंदगी, बिना पैसों की चिंता के।", "उदाहरण: कुटुंबाजवळ स्थिर आयुष्य, पैशांची काळजी नसलेले."),
        probe: { minWords: 4, vague: VAGUE_LIFE, ask: L("What would that life look like? For example: where they live, what they can afford.", "वह ज़िंदगी कैसी दिखेगी? जैसे: वे कहाँ रहेंगे, क्या-क्या कर पाएँगे।", "ते आयुष्य कसे असेल? उदा.: ते कुठे राहतील, काय काय करू शकतील.") } },
      { id: "P15_onething", type: "short", label: L("What ONE thing would help your child most to reach their future?", "बच्चे को उसके भविष्य तक पहुँचाने में सबसे ज़्यादा कौन सी एक चीज़ मदद करेगी?", "मुलाला त्याचे भविष्य गाठण्यासाठी सर्वात जास्त मदत कोणत्या एका गोष्टीची होईल?"),
        hint: L("Example: A computer course after Class 10.", "उदाहरण: 10वीं के बाद कंप्यूटर का कोर्स।", "उदाहरण: दहावीनंतर संगणकाचा कोर्स."),
        probe: { minWords: 3, vague: [...VAGUE_SUPPORT, ...VAGUE_EFFORT, "confidence", "education", "शिक्षा", "आत्मविश्वास", "शिक्षण"],
          ask: L("What exactly? For example: tuition, a phone or laptop, a good school nearby, money for fees, career guidance.", "ठीक-ठीक क्या? जैसे: ट्यूशन, फ़ोन या लैपटॉप, पास में अच्छा स्कूल, फ़ीस के लिए पैसे, करियर मार्गदर्शन।", "नेमके काय? उदा.: शिकवणी, फोन किंवा लॅपटॉप, जवळ चांगली शाळा, फीसाठी पैसे, करिअर मार्गदर्शन.") } },
    ] },
  ],
};

// ---------------------------------------------------------------- GENERAL PUBLIC
const PUBLIC = {
  key: "public",
  title: L("Everyone: Young People Around You", "सभी के लिए: आपके आसपास के युवा", "सर्वांसाठी: तुमच्या आजूबाजूचे तरुण"),
  intro: L("We want to hear how people see the future of young people around them. There are no right or wrong answers. It takes about 7 minutes.",
           "हम जानना चाहते हैं कि लोग अपने आसपास के युवाओं के भविष्य को कैसे देखते हैं। कोई जवाब सही या गलत नहीं है। इसमें लगभग 7 मिनट लगेंगे।",
           "लोक आपल्या आजूबाजूच्या तरुणांच्या भविष्याकडे कसे पाहतात, हे आम्हाला जाणून घ्यायचे आहे. यात कोणतेही उत्तर बरोबर किंवा चूक नाही. यासाठी साधारण ७ मिनिटे लागतील."),
  sections: [
    { id: "about", title: L("About you", "आपके बारे में", "तुमच्याबद्दल"), items: [
      { id: "G1_age", type: "number", required: true, min: 18, max: 100, label: L("How old are you?", "आपकी उम्र कितनी है?", "तुमचे वय किती आहे?") },
      { id: "G2_gender", type: "choice", required: true, label: L("What is your gender?", "आपका लिंग क्या है?", "तुमचे लिंग कोणते?"), options: GENDER },
      { id: "G3_state", type: "dropdown", required: true, label: L("Which state do you live in?", "आप किस राज्य में रहते हैं?", "तुम्ही कोणत्या राज्यात राहता?"), options: stateOptions },
      { id: "G4_district", type: "short", required: true, label: L("Which district do you live in?", "आप किस ज़िले में रहते हैं?", "तुम्ही कोणत्या जिल्ह्यात राहता?") },
      { id: "G5_work", type: "dropdown", required: true, other: true, label: L("What is your main work?", "आपका मुख्य काम क्या है?", "तुमचे मुख्य काम कोणते?"),
        options: [opt("teacher", "Teacher or education", "शिक्षक या शिक्षा", "शिक्षक किंवा शिक्षण क्षेत्र"), opt("govt", "Government job", "सरकारी नौकरी", "सरकारी नोकरी"), opt("private", "Private job", "प्राइवेट नौकरी", "खासगी नोकरी"),
          opt("business", "Own business or shop", "अपना व्यवसाय या दुकान", "स्वतःचा व्यवसाय किंवा दुकान"), opt("farmer", "Farmer", "किसान", "शेतकरी"), opt("daily", "Daily wage work", "दिहाड़ी मज़दूरी", "रोजंदारी"),
          opt("ngo", "NGO or social work", "एनजीओ या सामाजिक काम", "स्वयंसेवी संस्था किंवा सामाजिक काम"), opt("home", "Homemaker", "गृहिणी / घर का काम", "गृहिणी / घरकाम"), opt("student", "Student", "विद्यार्थी", "विद्यार्थी"),
          opt("retired", "Retired", "सेवानिवृत्त", "निवृत्त"), opt("notworking", "Not working", "काम नहीं कर रहे", "सध्या काम करत नाही")] },
    ] },
    { id: "views", title: L("Young people today", "आज के युवा", "आजचे तरुण"), items: [
      { id: "G6_better", type: "short", label: L("What is one thing that is BETTER for young people today than when you were young?", "आपके समय की तुलना में आज के युवाओं के लिए कौन सी एक चीज़ बेहतर है?", "तुमच्या लहानपणापेक्षा आजच्या तरुणांसाठी कोणती एक गोष्ट अधिक चांगली आहे?"),
        hint: L("Example: They can learn anything online.", "उदाहरण: वे ऑनलाइन कुछ भी सीख सकते हैं।", "उदाहरण: ते ऑनलाइन काहीही शिकू शकतात."),
        probe: { minWords: 4, ask: L("Could you say a little more about what has improved?", "क्या आप थोड़ा और बता सकते हैं कि क्या बेहतर हुआ है?", "काय सुधारले आहे, याबद्दल थोडे अधिक सांगाल का?") } },
      { id: "G6_harder", type: "short", label: L("What is one thing that is HARDER for them today?", "आज उनके लिए कौन सी एक चीज़ ज़्यादा मुश्किल है?", "आज त्यांच्यासाठी कोणती एक गोष्ट अधिक अवघड आहे?"),
        hint: L("Example: Much more competition for jobs.", "उदाहरण: नौकरी के लिए बहुत ज़्यादा मुकाबला।", "उदाहरण: नोकरीसाठी खूप जास्त स्पर्धा."),
        probe: { minWords: 4, ask: L("Could you say a little more about what has become harder?", "क्या आप थोड़ा और बता सकते हैं कि क्या मुश्किल हो गया है?", "काय अवघड झाले आहे, याबद्दल थोडे अधिक सांगाल का?") } },
      { id: "G7_learn", type: "para", label: L("What do young people need to learn or experience to do well in the future?", "भविष्य में अच्छा करने के लिए युवाओं को क्या सीखना या अनुभव करना चाहिए?", "भविष्यात चांगली प्रगती करण्यासाठी तरुणांनी काय शिकले किंवा अनुभवले पाहिजे?"),
        probe: { minWords: 5, vague: ["education", "skills", "skill", "knowledge", "shiksha", "शिक्षा", "ज्ञान", "हुनर", "शिक्षण", "कौशल्य"],
          ask: L("Which skills or experiences, specifically?", "ख़ास तौर पर कौन से हुनर या अनुभव?", "नेमकी कोणती कौशल्ये किंवा अनुभव?") } },
      { id: "G8_where", type: "short", label: L("Where can young people best get these skills? Name 1–2 places or people.", "युवा ये हुनर सबसे अच्छी तरह कहाँ से सीख सकते हैं? 1–2 जगहें या लोग बताइए।", "तरुणांना ही कौशल्ये सर्वात चांगल्या प्रकारे कुठे मिळू शकतील? १–२ ठिकाणे किंवा व्यक्ती सांगा."),
        hint: L("Example: Internships in local shops, and NSS camps in college.", "उदाहरण: आसपास की दुकानों में इंटर्नशिप, और कॉलेज के एनएसएस कैंप।", "उदाहरण: स्थानिक दुकानांमध्ये इंटर्नशिप, आणि कॉलेजमधील एनएसएस शिबिरे."),
        probe: { minWords: 3, ask: L("Please name a place or a person.", "कृपया कोई जगह या व्यक्ति बताइए।", "कृपया एखादे ठिकाण किंवा व्यक्ती सांगा.") } },
      { id: "G9_hope", type: "short", label: L("What is your one biggest hope for young people around you?", "अपने आसपास के युवाओं के लिए आपकी सबसे बड़ी उम्मीद क्या है?", "तुमच्या आजूबाजूच्या तरुणांबद्दल तुमची सर्वात मोठी आशा कोणती?"),
        hint: L("Example: That girls in my village finish college and get jobs.", "उदाहरण: कि मेरे गाँव की लड़कियाँ कॉलेज पूरा करें और नौकरी पाएँ।", "उदाहरण: माझ्या गावातील मुलींनी कॉलेज पूर्ण करावे आणि त्यांना नोकरी मिळावी."),
        probe: { minWords: 4, vague: VAGUE_LIFE, ask: L("Which young people, and what do you hope for them?", "कौन से युवा, और आप उनके लिए क्या उम्मीद करते हैं?", "कोणते तरुण, आणि त्यांच्यासाठी तुम्हाला काय आशा आहे?") } },
      { id: "G10_worry", type: "short", label: L("What is your one biggest worry for young people around you?", "अपने आसपास के युवाओं को लेकर आपकी सबसे बड़ी चिंता क्या है?", "तुमच्या आजूबाजूच्या तरुणांबद्दल तुमची सर्वात मोठी काळजी कोणती?"),
        hint: L("Example: Boys leave school early to work in cities.", "उदाहरण: लड़के जल्दी स्कूल छोड़कर शहरों में काम करने चले जाते हैं।", "उदाहरण: मुले लवकर शाळा सोडून शहरात कामाला जातात."),
        probe: { minWords: 4, ask: L("Could you say who is affected and how?", "क्या आप बता सकते हैं कि किस पर और कैसे असर पड़ रहा है?", "कोणावर आणि कसा परिणाम होत आहे, ते सांगाल का?") } },
      { id: "G11_mydo", type: "short", label: L("What is one thing YOU can do in the next 6 months for a young person you know?", "अगले 6 महीनों में आप अपने जान-पहचान के किसी युवा के लिए खुद कौन सी एक चीज़ कर सकते हैं?", "पुढच्या ६ महिन्यांत तुमच्या ओळखीच्या एखाद्या तरुणासाठी तुम्ही स्वतः कोणती एक गोष्ट करू शकता?"),
        hint: L("Example: Help my neighbour's son prepare for his bank interview.", "उदाहरण: पड़ोसी के बेटे को उसके बैंक इंटरव्यू की तैयारी में मदद करना।", "उदाहरण: शेजाऱ्यांच्या मुलाला बँकेच्या मुलाखतीच्या तयारीत मदत करणे."),
        probe: { minWords: 4, vague: VAGUE_SUPPORT, ask: L("What would you actually do, and for whom?", "आप असल में क्या करेंगे, और किसके लिए?", "तुम्ही प्रत्यक्षात काय कराल, आणि कोणासाठी?") } },
    ] },
  ],
};

export const TOOLS = { youth: YOUTH, parent: PARENT, public: PUBLIC };
