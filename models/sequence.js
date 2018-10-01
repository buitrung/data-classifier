var mongoose = require('mongoose');

var sequenceSchema, sequence;

sequenceSchema = new mongoose.Schema({
	_id: {type:String},
	next_seq_num : {type: Number, default:1}
});

sequence = mongoose.model('Counter', sequenceSchema);

exports.genSeq = function (name){
	return{
		nextVal: function(callback){
			sequence.findByIdAndUpdate(name, {$inc: { next_seq_num: 1 }}, function (err, seq){
				if(err){
					throw err;
				} 

				if(seq === undefined || seq === null){
					// create if doesn't exist
					var new_seq = new sequence({
						_id: name
                    });

					new_seq.save(function (err){
						if(err) throw err;

						return callback(new_seq.next_seq_num);
					});

				} 
				else {
					return callback(++seq.next_seq_num);
				}
			});
		}
	};
};