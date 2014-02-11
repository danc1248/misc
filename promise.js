'use strict';

var index = 0;

var P = function (parent) {
  this.index = index;
  this.state = 'empty';
  this.child = null;
  this.parent = parent;
  this.value = undefined;
  this.error = undefined;
  var self = this;
  this.successFunction = function(input) {
    self._next(null,input);
  };
  this.errorFunction = function(error) {
    self._next(error,null);
  };

  index += 1;
};

// because I hate typing new
P.promise = function(success, error) {
  var promise = new P();
  promise.then( success, error );
  return promise;
};

// promises are linked list where we only return reference to the start.
P.prototype.getSuperParent = function() {
  if(!this.parent)
    return this;

  return this.parent.getSuperParent();
};

// add success and error functions to the last promise in the chain, all params are optional
P.prototype.then = function(success, error) {
  var active = this.getCurrentOrNext();

  if(success) active.successFunction = function(input) {
    success(input, function(error,output) { active._next(error,output);});
  };
  if(error) active.errorFunction = function(input) {
    error(input, function(error,output) { active._next(error,output);});
  };

  active.state = 'pending';

  return active;
};

P.prototype.getCurrentOrNext = function() {
  if(this.state=='pending') {
    this.child = new P(this);
    return this.child;
  }
  return this;
};

// start the chain
P.prototype.execute = function(error, input) {
  var root = this.getSuperParent();
  root._execute(error,input);
  return this;
};

// internal method for executing the current promise
P.prototype._execute = function(error, input) {
  if(this.state!='pending') {
    throw new Error("executeThis called by state is pending "+this);
  }
  if(error) {
    this.errorFunction(error);
  }
  else {
    this.successFunction(input);
  }
};

// internal method for executing the next promise
P.prototype._next = function(error, input) {
  if(error) {
    this.state = 'error';
    this.error = error;
  }
  else {
    this.state = 'success';
    this.value = input;
  }
  if(this.child) {
    this.child._execute(error, input);
  }
};

// inject an array of data into the promise chain, useful with each
P.prototype.inject = function(elements,error) {
  return this.then(function(ignore, callback) {
      callback(null, elements);
    },error);
};

// would pass an array into the success function, instead call the 
// success function for each element in the array, and don't pass go
// until all have resolved.  Only keeps track of most recent values
P.prototype.each = function(success, error) {
  var active = this.getCurrentOrNext();

  if(success) active.successFunction = function(inputs) {
    var count = inputs.length;
    var complete = 0;
    var latestError = null;

    for(var a=0; a<count; a++) {
      success(inputs[a], function(error, output) {
        complete += 1;
        if(error) {
          latestError = error;
        }
        if(count === complete) {
          active._next(latestError, output);
        }
      });
    }
  };
  if(error) this.errorFunction = function(input) {
    error(input, function(error,output) { active._next(error,output); });
  };

  active.state = 'pending';
  return active;
};

var promise = P.promise().then().then().then().then(
  function( input, callback ) {
    console.log("successFunction0");
    input.push("start");
    callback( null, input );
  }
)
.then(
  function( input, callback ) {
    console.log("successFunction1");
    input.push("2");
    callback( null, input );
  }
)
.then(
  function( input, callback ) {
    console.log(input);
    callback( null, input );
  }
)
.inject(["hello","world"])
.each(
  function( input, callback ) {
    console.log( input );
    callback( null, input );
  }
)
.execute(null,[]);

console.log("promise value:",promise.value);




