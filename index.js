#!/usr/bin / env node

const path = require('path');

const express = require('express');
const app = express();

const fetch = require("node-fetch");

const mdns = require('mdns-js');
const { v4: uuidv4 } = require('uuid');

const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require('cors');
const fs = require('fs');
const { Console } = require('console');
const { json } = require('body-parser');
require( 'console-stamp' )( console );

var hostid_file = "hostid.json";
var hostid;

// See if the file exists
if(fs.existsSync(hostid_file)){
    var hostid_json = JSON.parse(fs.readFileSync(hostid_file));
    hostid = hostid_json["hostid"];
}else{
    hostid = uuidv4();
    var obj = {};
    obj["hostid"] = hostid;
    fs.writeFileSync(hostid_file, JSON.stringify(obj));
}

app.use(cors());
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(bodyParser.json({limit: '100mb'}));
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log('Server für SAM-KI-Assistenz');
    console.log("(c)2023, 2024 David Breunig, Fraunhofer IPA");
    console.log("Beta v0.1.5");
    console.log(`Host-Id: ${hostid}`);
    console.log(`Listener auf ${port}`);
    console.log('PORT als Umgebungsvariable für anderen Port');
});

/*const ad = mdns.createAdvertisement(mdns.tcp('http'), 4000, {
    name:'SAM-KI-Server',
    txt: {
      host:hostid
    }
  });
ad.start();*/

app.get("/model",async (req, res)=> {
    console.log("GET /model");
    res.status(200).send(fs.readFileSync("Modelle.json"));
})

app.get('/Modelle/:modell', async (req, res) => {
    console.log("GET " + req.url);
    try {
        if (req.params.modell.indexOf('..') != -1) {
            console.log("Model not found");
            res.status(404).send(err);
        }
        console.log("OK");
        res.status(200).send(fs.readFileSync("Modelle/" + req.params.modell));
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
})

app.get('/Modelle', async (req, res) => {
    console.log("GET /Modelle");
    try {
      const fileNames = await fs.promises.readdir("Modelle");
      console.log(fileNames);
      res.status(200).send(fileNames);
    } catch (err) {
      console.error(err);
      res.status(500).send(err);
    }
});

app.get('/Meldungen/:Meldung', async (req, res) => {
    console.log("GET " + req.url);
    try {
        if (req.params.Meldung.indexOf('..') != -1) {
            console.log("Meldung not found");
            res.status(404).send(err);
        }
        console.log("OK");

        var meldung = JSON.parse(fs.readFileSync("meldungen/" + req.params.Meldung + ".json"));

        const files = fs.readdirSync("meldungen");
        const matchingFiles = files.filter(file => file.startsWith(req.params.Meldung) && file.endsWith(".jpeg"));
        const removedStrings = matchingFiles.map(str => str.slice(0, -5));

	// Auskommentiert, damit Frontend korrekt auf Bilder zugreifen kann
        // meldung.images = removedStrings;

        res.status(200).send(meldung);
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

app.get('/Meldungen/Auswertung/:Montageplatz', async (req, res) => {
    console.log("GET " + req.url);
    if (req.params.Montageplatz == "" ) res.status(500).send(err);

    const files = fs.readdirSync("meldungen");

    var matchingFiles = null;
    if (req.params.Montageplatz == "alle")
    {
        matchingFiles = files.filter(file => file.endsWith(".json"));
    } else {
        matchingFiles = files.filter(file => file.startsWith(req.params.Montageplatz) && file.endsWith(".json"));
    }

    var csv_output = "Zeitstempel;Abteilungen;Montageplatz;Auftrag;Baugruppe;Grund;Text\n";

    for (const file of matchingFiles)
    {
        console.log(file);
        try {
            var obj = JSON.parse(fs.readFileSync("meldungen/" + file));
            obj.Auftrag = obj.Auftrag.replace('\r\n', '   ');
            obj.Auftrag = obj.Auftrag.replace('\n', '   ');
            obj.Auftrag = obj.Auftrag.replace('\t', '   ');
        
            obj.Baugruppe = obj.Baugruppe.replace('\r\n', '   ');
            obj.Baugruppe = obj.Baugruppe.replace('\n', '   ');
            obj.Baugruppe = obj.Baugruppe.replace('\t', '   ');
            
            obj.Text = obj.Text.replace('\r\n', '   ');
            obj.Text = obj.Text.replace('\n', '   ');
            obj.Text = obj.Text.replace('\t', '   ');
            csv_output += new Date(obj.Zeitstempel).toLocaleDateString("de-DE") + ";" + obj.Abteilungen + ";" + obj.Montageplatz + ";" + obj.Auftrag + ";" + obj.Baugruppe + ";" + obj.Grund + ";" + obj.Text + "\n";
        } catch {
            
        }
    }

    var filename = "";

    if (req.params.Montageplatz == "alle")
    {
        filename = "Auswertung.csv";
    } else {
        filename = req.params.Montageplatz + ".csv";
    }
    
    fs.writeFileSync(filename, csv_output);

    console.log("OK");
    //res.contentType("file/csv");
    //res.status(200).send(csv_output);

    const options = {
        //root: path.join(__dirname)
		root: "."
    };

    res.sendFile(filename, options, function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log('Sent:', filename);
        }
    });
});

app.get('/Meldungen_Liste/:Montageplatz', async (req, res) => {
    console.log("GET " + req.url);
    if (req.params.Montageplatz == "") res.status(404).send(err);

    try {
        const files = fs.readdirSync("meldungen");
        const matchingFiles = files.filter(file => file.startsWith(req.params.Montageplatz) && file.endsWith(".json"));
        const removedStrings = matchingFiles.map(str => str.slice(0, -5));

        console.log("OK");
        res.status(200).send(removedStrings);
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }   
});

app.get('/Fotos/:foto', async (req, res) => {
    console.log("GET " + req.url);
    try {
        if (req.params.foto.indexOf('..') != -1) {
            console.log("Photo not found");
            res.status(404).send(err);
        }
        console.log("OK");
        const img = fs.readFileSync("meldungen/" + req.params.foto + ".jpeg");

        res.writeHead(200, {'Content-Type': 'blob' });
        res.end(img, 'binary');
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
})

app.get('/Thumbnails/:foto', async (req, res) => {
    console.log("GET " + req.url);
    try {
        if (req.params.foto.indexOf('..') != -1) {
            console.log("Photo not found");
            res.status(404).send(err);
        }
        console.log("OK");

        const buffer = await sharp("meldungen/" + req.params.foto + ".jpeg").resize(320).toBuffer();

        res.writeHead(200, {'Content-Type': 'blob' });
        res.end(buffer, 'binary');
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
})

app.get('/testmail', async (req, res) => {
    console.log("GET /testmail");
    var settings = JSON.parse(fs.readFileSync("Mail.json"));
    console.log("Mail-Settings: " + JSON.stringify(settings));
    let transporter = nodemailer.createTransport(settings);

    let message = {
        from: settings.from,
        to: settings.from,
        subject: 'Testnachricht',
        text: 'Testnachricht'
    };

    transporter.sendMail(message, (err, info) => {
        if (err) {
            console.log('Error occurred. ' + err.message);
            res.status(500).send(err.message);   
        } else {
            console.log('Message sent: %s', info.messageId);
            res.status(200).send('OK');
        }
    });
});

app.get('/verifymail', async (req, res) => {
    console.log("GET /verifymail");
    var settings = JSON.parse(fs.readFileSync("Mail.json"));
    console.log("Mail-Settings: " + JSON.stringify(settings));
    let transporter = nodemailer.createTransport(settings);

    transporter.verify(function (error, success) {
        if (error) {
            console.log("Error occurred. " + error);
            res.status(500).send("Error occurred. " + error);
        } else {
            console.log("Server is ready to take our messages");
            res.status(200).send("OK");
        }
    });
});

app.post("/send", async (req, res) => {
    console.log("POST /send");
    var settings = JSON.parse(fs.readFileSync("Mail.json"));

    let transporter = nodemailer.createTransport(settings);

    var Adressen = null;
    var Ziele_erstellt = [];

    //console.log("msg: " + JSON.stringify(req.body));

    try {
        console.log("Modell: " + req.body.Modellidentifikation);
        var Ausgangsmodell = JSON.parse(fs.readFileSync("Modelle/" + req.body.Modellidentifikation));
        Adressen = Ausgangsmodell.VerantwortlicheAdressen;
        console.log("Adressen: " + JSON.stringify(Adressen));
    } catch {

    }    

    var Abteilungen = req.body.Abteilungen;
    console.log("Abteilungen '" + Abteilungen + "'");

    for (const Ziel2 of Abteilungen) {
        var z = Ziel2;
        
        if (!Adressen.hasOwnProperty(z)) continue;

        for (const element of Adressen[z])
        {
            if (!Ziele_erstellt.includes(element)) Ziele_erstellt.push(String(element));
        }
    }

    var Verantwortliche = req.body.AuswahlVerantwortliche;
    for (const Ziel2 of Verantwortliche) {
        var z = String(Ziel2);
        //console.log("Ziel2: " + z);

        if (!Adressen.hasOwnProperty(z)) continue;

        for (const element of Adressen[z])
        {
            if (!Ziele_erstellt.includes(element)) Ziele_erstellt.push(String(element));
        }
    }

    console.log("Ziele_erstellt: " + Ziele_erstellt);

    try {
        fs.mkdirSync('meldungen');
    } catch (error) {
        console.log(error);
    }

    var timestamp = Date.now();

    let file_content = {
        //Verantwortliche: req.body.Verantwortliche,
        Zeitstempel: timestamp,
        Abteilungen: req.body.Abteilungen,
        Montageplatz: req.body.Montageplatz,
        Grund: req.body.Grund
    };

    var meldung = req.body.Montageplatz + "_" + timestamp + "_" + req.body.Grund;
    //meldung = meldung.replaceAll(':'|'\\'|'/'|'?'|'*'|'<'|'>'|'\"', "-");
    meldung = meldung.replaceAll(['\|/<>"*?'], "-");

    let msg_content = "";

    if (settings.Einleitungstext != undefined)
    {
        if (settings.Einleitungstext != "")
        {
            msg_content = settings.Einleitungstext + "\n\n";
        }
    }

    let message = {
        from: settings.from,
        subject: 'SAM-KI-Nachricht: Meldung ' + req.body.Grund + " an " + req.body.Montageplatz,
        attachments:  []
    };

    msg_content += "Montageplatz: " + JSON.stringify(req.body.Montageplatz) + "\n" +
        "Grund: " + JSON.stringify(req.body.Grund).replaceAll('[', '').replaceAll(']', '').replaceAll(',', ', ') + "\n";

    for (let i = 0; i < Object.keys(Ausgangsmodell.Anlagen).length; i++)
    {
        const titel = Object.keys(Ausgangsmodell.Anlagen)[i];

        if (req.body.Anlagen.hasOwnProperty(titel))
        {
            if (Ausgangsmodell.Anlagen[titel] == 'Text' || Ausgangsmodell.Anlagen[titel] == 'Code')
            {
                file_content[titel] = req.body.Anlagen[titel];
                msg_content += titel + ": " + JSON.stringify(req.body.Anlagen[titel]) + "\n";
            } else if (Ausgangsmodell.Anlagen[titel] == 'Foto') {
                try {
                    let foto = req.body.Anlagen[titel];
                    var ending = foto.split(";",1)[0].split("/")[1];
                    let base64Image = foto.split(';base64,').pop();
                    fs.writeFile('meldungen/' + meldung + "_" + titel + "." + ending, base64Image, {encoding: 'base64'}, function(err) {
                        console.log('Bild erstellt: ' + titel);
                    });
                    message.attachments = [...message.attachments, {
                        filename: meldung + "_" + titel + "." + ending,
                        path: foto
                    }];
                } catch (error) {
                    console.log(error);
                }
            }
        } else {
            if (Ausgangsmodell.Anlagen[titel] == 'Text' || Ausgangsmodell.Anlagen[titel] == 'Code')
            {
                file_content[titel] = ""
                msg_content += titel + ": \n";
            }
        }
    }

    if (settings.Hinweistext != undefined)
    {
        if (settings.Hinweistext != "")
        {
            msg_content += "\n\n" + settings.Hinweistext;
        }
    }

    msg_content = msg_content.replaceAll('"', '');

    message.text = msg_content;

    try {
        fs.writeFile("meldungen/" + meldung + ".json", JSON.stringify(file_content, null, "\t"), function(err) {
            console.log("Meldung erstellt: " + meldung);
        });
    } catch (error) {
        console.log(error);
    }    

    if (req.body.hasOwnProperty('Video'))
    {
        try {
            var ending = req.body.Video.split(";",1)[0].split("/")[1];
            let base64Video = base64String.split(';base64,').pop();
            fs.writeFile('meldungen/' + meldung + "." + ending, base64Video, {encoding: 'base64'}, function(err) {
                console.log('Video erstellt');
            });
        } catch (error) {
            console.log(error);
        }
    }

    for (const Ziel of Ziele_erstellt)
    {
        console.log("Ziel: " + String(Ziel));     
        
        message.to = Ziel;
    
        transporter.sendMail(message, (err, info) => {
            if (err) {
                console.log('Fehler beim Mailsenden: ' + err.message);
                //res.status(500).send(err.message);
            } else {
                console.log('Mail versendet: %s', info.messageId);
            }
        });
    }

    res.status(200).send('OK');
});

function getValuesAsArray(dict) {
    let result = [];
    for (let key in dict) {
      result.push(dict[key]);
    }
    return result;
}

function sortDictByValues(dict){
    const entries = Object.entries(dict);

    return entries.sort((a, b) => b[1] - a[1]).reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
    }, {});
}

function createDict(arr){
    let dict = {};
    for(let i = 0; i < arr.length; i++){
        dict[arr[i]] = 0;
    }
    return dict;
}

/*app.post("/modellSpeichern", async (req, res) => {
    fs.writeFileSync("Modelle.json", req.body);
    res.status(200).send('OK');  
});*/

app.get("/sortiertesModell", async (req, res)=>{
    var file_modell = fs.readFileSync("Modelle.json");
    var basismodell = JSON.parse(file_modell);
    var sortiertesmodell = {};

    sortiertesmodell.RepertoireAbteilungen = createDict(basismodell.RepertoireAbteilungen);
    sortiertesmodell.RepertoireGruende = {};
    sortiertesmodell.RepertoireVerantwortliche = {};
    for (let k in basismodell.RepertoireGruende)
    {
        sortiertesmodell.RepertoireGruende[k] = createDict(basismodell.RepertoireGruende[k]);
    }
    for (let k in basismodell.RepertoireVerantwortliche)
    {
        sortiertesmodell.RepertoireVerantwortliche[k] = createDict(basismodell.RepertoireVerantwortliche[k]);
    }
   
    var files = fs.readdirSync('meldungen');

    for (let i = 0; i < files.length; i++) {
        var file = files[i];
    
        if (!file.includes(".json")) continue;

        try {
            var file_read = fs.readFileSync('meldungen/' + file);
            var obj = JSON.parse(file_read);

            var abts = obj.Abteilungen;
            var gdks = obj.Grund;            
            var veran = obj.Verantwortliche;

            for (let j = 0; j < abts.length; j++)
            {
                var abt = abts[j];

                if (abt in sortiertesmodell.RepertoireAbteilungen)
                {
                    sortiertesmodell.RepertoireAbteilungen[abt] +=1;

                    for (let k = 0; k < gdks.length; k++)
                    {
                        var grund = gdks[k];
                        if (grund in sortiertesmodell.RepertoireGruende[abt]) sortiertesmodell.RepertoireGruende[abt][grund] +=1;
                    }

                    for (let k = 0; k < veran.length; k++)
                    {
                        var ver = veran[k];
                        if (veran in sortiertesmodell.RepertoireVerantwortliche[abt]) sortiertesmodell.RepertoireVerantwortliche[abt][ver] +=1;
                    }
                }
            }
        } catch {

        }
    }

    for (let k in sortiertesmodell.RepertoireGruende)
    {
        sortiertesmodell.RepertoireGruende[k] = sortDictByValues(sortiertesmodell.RepertoireGruende[k]);
        sortiertesmodell.RepertoireGruende[k] = Object.keys(sortiertesmodell.RepertoireGruende[k]);
    }
    for (let k in sortiertesmodell.RepertoireVerantwortliche)
    {
        sortiertesmodell.RepertoireVerantwortliche[k] = sortDictByValues(sortiertesmodell.RepertoireVerantwortliche[k]);
        sortiertesmodell.RepertoireVerantwortliche[k] = Object.keys(sortiertesmodell.RepertoireVerantwortliche[k]);
    }
    sortiertesmodell.RepertoireAbteilungen = sortDictByValues(sortiertesmodell.RepertoireAbteilungen);
    sortiertesmodell.RepertoireAbteilungen = Object.keys(sortiertesmodell.RepertoireAbteilungen);

    res.send(JSON.stringify(sortiertesmodell));
});

function haeufigkeitenErzeugen()
{
    var files = fs.readdirSync('meldungen');

    var dict_gdks = {};
    var dict_abts = {};
    var dict_veran = {};

    for (let i = 0; i < files.length; i++) {
        var file = files[i];
    
        if (!file.includes(".json")) continue;

        try {
            var file_read = fs.readFileSync('meldungen/' + file);
            var obj = JSON.parse(file_read);

            var gdks = obj.Grund;
            var abts = obj.Abteilungen;
            var veran = obj.Verantwortliche;

            for (let j = 0; j < gdks.length; j++)
            {
                var grund = gdks[j];
                if (grund in dict_gdks) dict_gdks[grund] +=1;
                else dict_gdks[grund] = 1;
            }

            for (let j = 0; j < abts.length; j++)
            {
                var abt = abts[j];
                if (abt in dict_abts) dict_abts[abt] +=1;
                else dict_abts[abt] = 1;
            }

            for (let j = 0; j < veran.length; j++)
            {
                var ver = veran[j];
                if (ver in dict_veran) dict_veran[ver] +=1;
                else dict_veran[ver] = 1;
            }
        } catch {

        }
    }

    var dict_haeufig = {};
    dict_haeufig["GdK"] = dict_gdks;
    dict_haeufig["Verantwortliche"] = dict_veran;
    dict_haeufig["Abteilungen"] = dict_abts;

    return dict_haeufig;
}

app.get("/haeufigkeiten",async (req, res)=>{
    var dict_haeufig = haeufigkeitenErzeugen();

    res.send(JSON.stringify(dict_haeufig));
});

app.post("/feedback", async(req, res) =>{
    console.log("POST /feedback");
    console.log("Body: " + JSON.stringify(req.body));

    var timestamp = Date.now();
    var meldung = "feedback_" + req.body.Montageplatz + "_" + timestamp;
    //meldung = meldung.replaceAll(':'|'\\'|'/'|'?'|'*'|'<'|'>'|'\"', "-");
    meldung = meldung.replaceAll(['\|/<>"*?'], "-");
    
    postJsonToPastebin(meldung, JSON.stringify(req.body));

    var settings = JSON.parse(fs.readFileSync("Mail.json"));
    let transporter = nodemailer.createTransport(settings);
    console.log("Mail-Settings: " + JSON.stringify(settings));

    var feedback = JSON.parse(fs.readFileSync("Feedback.json"));

    let message = {
        from: settings.from,
        to: feedback["Ziel"],
        subject: meldung,
        text: JSON.stringify(req.body)
    };

    transporter.sendMail(message, (err, info) => {
        if (err) {
            console.log('Error occurred. ' + err.message);
            //res.status(500).send(err.message);   
        } else {
            console.log('Message sent: %s', info.messageId);
        }
    });
    res.status(200).send('OK');
});

async function postJsonToPastebin(name, jsonObj) {
  try {
    console.log("postJsonToPastebin");
    var settings = JSON.parse(fs.readFileSync("Feedback.json"));
    console.log("Pastebin-Settings: " + JSON.stringify(settings));

    const authResponse = await fetch(`https://pastebin.com/api/api_login.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `api_dev_key=${settings.apiDevKey}&api_user_name=${settings.userName}&api_user_password=${settings.userPassword}`,
    });
    
    const apiKeyValue = await authResponse.text();
    
    const postDataResponse = await fetch(`https://pastebin.com/api/api_post.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `api_option=paste&api_dev_key=${settings.apiDevKey}&api_user_key=${apiKeyValue}&api_paste_code=${encodeURIComponent(jsonObj)}&api_paste_private=1&api_paste_name=${name}`,
    });
    
    const postData = await postDataResponse.text();
    
    console.log("Pastebin-Link: " + postData);
  } catch (error) {
    console.error(error);
  }
}
