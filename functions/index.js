var DataFrame = require('dataframe-js').DataFrame;
const functions = require('firebase-functions');
const express = require('express');
const engines = require('consolidate');
const Handlebars = require('handlebars');
const admin = require('firebase-admin');
const fs = require('fs');

var config = {
    apiKey: "AIzaSyBCh5h_crWltWd8cTpVG0Ed5rM2yL8y9yY",
    authDomain: "scouting-backend-2019.firebaseapp.com",
    databaseURL: "https://scouting-backend-2019.firebaseapp.com/",
    projectId: "scouting-backend-2019",
    //storageBucket: "practice-scouting-ebc88.appspot.com",
    messagingSenderId: "724301880545"
  };

var cols = []
var summaryCols = [];
summaryCols = ['Team_#',
			   'Avg match score',
	   		   'Avg Inner PCs',
   			   'Avg Outer PCs',
	  		   'Avg Bottom PCs',
 			   'Rotation',
 			   'Position',
 			   'Hangs',
 			   'Avg PCs Defended',
    		   'Avg PCs Undefended',
    		   'Matches Played Defense',
               'Penalties'];

cols = ["Team_#", 
        "Match_#", 
        "Alliance",
        "No Show?",
        "Cross Initiation Line",
        "Inner Port Auto", 
        "Outer Port Auto",
        "Bottom Port Auto",
        "Inner Port TeleOp",
        "Outer Port TeleOp",
        "Bottom Port TeleOp",
        "Rotation Control",
        "Position Control",
        "Hang",
        "Buddy Hang",
        "Deployment Accuracy",
        "Penalties",
        "Defended",
        "Played Defense",
        "Ground Intake",
        "Notes",
        "Scouter",
        "Avg Points Defended",
        "Avg Points Undefended"
        ];

admin.initializeApp(functions.config().firebase);
const app = express();
app.engine('hbs', engines.handlebars);
app.set('views', './views');
app.set('view engine', 'hbs');

var scoutDataFrame = null; // do NOT use these vars directly
var summaryDataFrame = null;

exports.app = functions.https.onRequest(app);

function getFullData(callback) {
    if (scoutDataFrame !== null) {
        callback(scoutDataFrame);
        return;
    }
    var jsonData = JSON.parse(fs.readFileSync('./allData.json', 'utf-8', err => { //Filepath used to be ./allData.json, only change here
        if (err) throw err;
    }));
    var vals = Object.keys(jsonData).map(k => {
        return jsonData[k];
    });
    scoutDataFrame = new DataFrame(vals, cols);
    scoutDataFrame.sql.register('full');
    callback(scoutDataFrame);
}



function getSummaryData(callback) {
    if (summaryDataFrame !== null) {
        callback(summaryDataFrame);
        return;
    }

    getFullData(scoutDF => {
        summaryDataFrame = scoutDF.groupBy('Team_#').aggregate(group => (6*group.stat.mean('Inner Port Auto') + 4*group.stat.mean('Outer Port Auto') + 2*group.stat.mean('Bottom Port Auto') + 3*group.stat.mean('Inner Port TeleOp') + 2*group.stat.mean('Outer Port TeleOp') + group.stat.mean('Bottom Port TeleOp') + "/" + group.count()), 'avg');
        summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.sum('Inner Port Auto') + group.stat.sum('Inner Port TeleOp') + "/" + group.count())), 'Team_#', 'avg', 'inner');
        // summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.sum('Outer Port Auto') + group.stat.sum('Outer Port TeleOp') + "/" + group.count())), 'Team_#', 'avg', 'inner', 'outer');
        summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.sum('Bottom Port Auto') + group.stat.sum('Bottom Port TeleOp') + "/" + group.count())), 'Team_#', 'avg', /*'inner',*/ 'outer', 'bottom');
        summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.mean('Rotation Control') * 100 + "%")), 'Team_#', 'avg', /*'inner',*/ 'outer', 'bottom', 'rotation');
        summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.mean('Position Control') * 100 + "%")), 'Team_#', 'avg', 'inner', 'outer', 'bottom', 'rotation', 'position');
        summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.mean('Hang') * 100 + "%")), 'Team_#', 'avg', 'inner', 'outer', 'bottom', 'rotation', 'position','hang');
        summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.mean('Avg Points Defended'))), 'Team_#', 'avg', 'inner', 'outer', 'bottom', 'rotation', 'position', 'hang', 'defended');
        summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.mean('Avg Points Undefended'))), 'Team_#', 'avg', 'inner', 'outer', 'bottom', 'rotation', 'position', 'hang', 'defended', 'undefended');
        summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.sum('Played Defense'))), 'Team_#', 'avg', 'inner', 'outer', 'bottom', 'rotation', 'position', 'hang', 'defended', 'undefended', 'defense');
        summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.mean('Penalties') + "/" + group.count())), 'Team_#', 'avg', 'inner', 'outer', 'bottom', 'rotation', 'position', 'hang', 'defended', 'undefended', 'defense', 'penalties');




       // summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.mean('Crg_scrd in the rkt_lvl_1') + group.stat.mean('Crg_scrd in the rkt_lvl_2') + group.stat.mean('Crg_scrd in the rkt_lvl_3')) + "/" + group.count(), 'crg-scrd-rkt'),'Team_#', 'max-score', 'crg-scrd-rkt');
        // summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.mean('Hch_scrd on the rkt_lvl_1') + group.stat.mean('Hch_scrd on the rkt_lvl_2') + group.stat.mean('Hch_scrd on the rkt_lvl_3')) + "/" + group.count(), 'hch-scrd-rkt'),'Team_#', 'max-score', 'crg-scrd-rkt', 'hch-scrd-rkt');
        // summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.sum('Ttl_crg scrd in crg_shp') + "/" + group.count()), 'crg-scrd-csh'),'Team_#', 'max-score', 'crg-scrd-rkt', 'hch-scrd-rkt', 'crg-scrd-csh');
        // summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.sum('Ttl_hch scrd on crg_shp') + "/" + group.count()), 'hch-scrd-csh'),'Team_#', 'max-score', 'crg-scrd-rkt', 'hch-scrd-rkt', 'crg-scrd-rkt', 'hch-scrd-csh');
        // //summaryDataFrame = summaryDateFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.sum('Ttl_# of grnd_pkups') + "/" + group.count()), 'grnd-pkup'),'Team_#', 'max-score', 'crg-scrd-rkt', 'hch-scrd-rkt', 'crg-scrd-rkt', 'hch-scrd-csh', 'grnd-pkup');
        // summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.sum('#_hch_scrd back_side of_rkt') + "/" + group.count()), 'scrd-both'),'Team_#', 'max-score', 'crg-scrd-rkt', 'hch-scrd-rkt', 'crg-scrd-rkt', 'hch-scrd-csh',/* 'grnd-pkup',*/ 'scrd-both');
        // summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.sum('Starts on HAB_lvl_2') + "/" + group.count()), 'start-hablvl'),'Team_#', 'max-score', 'crg-scrd-rkt', 'hch-scrd-rkt', 'crg-scrd-rkt', 'hch-scrd-csh',/* 'grnd-pkup',*/ 'scrd-both', 'start-hablvl');
        // summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.sum('Ended on HAB_lvl_1') + "/" + group.count()), 'hab-lvl1'),'Team_#', 'max-score', 'crg-scrd-rkt', 'hch-scrd-rkt', 'crg-scrd-rkt', 'hch-scrd-csh',/* 'grnd-pkup',*/ 'scrd-both', 'start-hablvl', 'hab-lvl1');
        // summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.sum('Ended on HAB_lvl_2') + "/" + group.count()), 'hab-lvl2'),'Team_#', 'max-score', 'crg-scrd-rkt', 'hch-scrd-rkt', 'crg-scrd-rkt', 'hch-scrd-csh',/* 'grnd-pkup',*/ 'scrd-both', 'start-hablvl', 'hab-lvl1', 'hab-lvl2');
        // summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.sum('Ended on HAB_lvl_3') + "/" + group.count()), 'hab-lvl3'),'Team_#', 'max-score', 'crg-scrd-rkt', 'hch-scrd-rkt', 'crg-scrd-rkt', 'hch-scrd-csh',/* 'grnd-pkup',*/ 'scrd-both', 'start-hablvl', 'hab-lvl1', 'hab-lvl2', 'hab-lvl3');
        // summaryDataFrame = summaryDataFrame.innerJoin(scoutDF.groupBy('Team_#').aggregate(group => (group.stat.sum('Penalties') + "/" + group.count()), 'penalties'),'Team_#', 'max-score', 'crg-scrd-rkt', 'hch-scrd-rkt', 'crg-scrd-rkt', 'hch-scrd-csh',/* 'grnd-pkup',*/ 'scrd-both', 'start-hablvl', 'hab-lvl1', 'hab-lvl2', 'hab-lvl3', 'penalties');

        console.log("Summary Data Frame Dict: ", JSON.stringify(summaryDataFrame.toJSON()));
        summaryDataFrame.sql.register('summary');
        callback(summaryDataFrame);
    });
}

app.get('/', (request, response) => {
    getSummaryData(summaryDF => {
        var dataArr = JSON.stringify(summaryDF.toArray());
        console.log(dataArr);
        console.log("COLS\n" + summaryCols);
        response.render('index', {
            data: dataArr,
            "cols": summaryCols,
            summary: true
        });
    });
});

app.get('/full', (request, response) => {
    getFullData(fullDF => {
        var dataArr = JSON.stringify(fullDF.toArray());
        response.render('index', {
            data: dataArr,
            "cols": cols
        });
    });
});

app.get('/refresh', (req, res) => {
    scoutDataFrame = null;
    summaryDataFrame = null;
    res.redirect('/');
});

app.get('/allData.csv', (request, response) => {
    getFullData(fullDF => {
        var csv = fullDF.toCSV(true, './allData.csv');

        response.setHeader(
            "Content-disposition",
            "attachment; filename=allData.csv"
        )
        response.set("Content-Type", "text/csv")
        response.status(200).send(csv)
    });
});