var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var staticValue = require('./static-value');

var moment = require('moment');

var sequenceGenerator = require('./sequence');
var categorySequence = sequenceGenerator.genSeq('Category');


var categorySchema = new Schema({
    _id: {type: Number, index: true},
    name: {type: String, required: true},
    cover: {type: String},
    description: {type: String},
    topic_rule: {type: String},
    slug: {type: String},
    icon: {type: String},
    status: {type: Number, default: 1},
    parent: {type: Number, ref: 'Category'},
    order: {type: Number},
    creator_id: {type: Number, ref: 'User'},
    setting: {
        tag_type: { type: Number, default: 0 }     //0: color; 1: image;...
    },
    created_at: {type: Date, default: Date.now},
    updated_at: {type: Date, default: Date.now}
});

categorySchema.pre('save', function (next){
    var self = this;

    var currentDate = Date.now();
    this.updated_at = currentDate;

    if(this.isNew){
        categorySequence.nextVal(function (next_val){
            self._id = next_val;
            next();
        });
    }
    else {
        next();
    }

});

categorySchema.methods.getStatusName = function (cb) {
    var statusName = '';
    switch (this.status) {
        case (staticValue.CATEGORY_STATUS_ACTIVE):
            statusName = "Active";
            break;
        case (staticValue.CATEGORY_STATUS_INACTIVE):
            statusName = "Inactive";
            break;
    }
    return (statusName);
};
categorySchema.methods.getCreatedAt = function (cb) {
    var date = moment(this.created_at);
    return date.format("DD-MM-YYYY");
};
Category = mongoose.model('Category', categorySchema);

module.exports = Category;