/**
 * Train Test
 *
 * ALL TESTS ARE FOR RAW DATA OUTPUT
 * 
 */
const nTRAINS = require('../models/train')

/**
 * ALL Trains
 * That exist in db.trains
 */
exports.allTrains = (req, res) => {
    nTRAINS.find((err, docs) => {
        res.render('reference/singleTrain', docs)
    })
}
/**
 * ALL Trains
 * TD Active
 */
exports.rawAllTDHeadcode = (req, res) => {
    nTRAINS.find({ 'tdActive': true }, 'descr', function (err, docs) {
        res.render('nrdf/raw/trainHeadcode', { title: 'TD Activated', trains: docs })
    })
}
/**
 * ALL Trains
 * TD Active
 * Movement Active
 * Schedule Active
 */
exports.rawAllTDMovementHeadcode = (req, res) => {
    nTRAINS.find({ 'movementActive': true, 'tdActive': true, 'scheduleActive': true }, 'descr', function (err, docs) {
        res.render('nrdf/raw/trainHeadcode', { title: 'TD & Movement & Schedule Activated', trains: docs })
        //res.render('nrdf/raw/test',{title: 'TD & Movement & Schedule Activated',trains:docs})
    })
}

/**
 * Testing Different Query Style
 */
exports.rawStateQ = (req, res) => {
    var query = getStatus(req)
    var promise = query.exec();
    promise.then(docs => {
        //res.json(docs)
        res.render('nrdf/raw/status', { title: 'WOW Status', trains: docs })
    });
}

function getStatus(req) {
    var query = nTRAINS.find({ 'movementActive': true, 'tdActive': true, 'scheduleActive': true }, 'descr lastMovement.variation_status');
    return query
}
/**
 * TODO: Next Route in Testing
 */
