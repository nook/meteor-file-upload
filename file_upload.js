// Create a file collection, and enable file upload and download using HTTP
myFiles = new FileCollection('myFiles',
  { resumable: true,   // Enable built-in resumable.js upload support
    http: [
      { method: 'get',
        path: '/:md5',  // this will be at route "/gridfs/myFiles/:md5"
        lookup: function (params, query) {  // uses express style url params
          return { md5: params.md5 };       // a query mapping url to myFiles
        }
      }
    ]
  }
);


if (Meteor.isServer) {

  Meteor.publish("myFiles", function(){
    return myFiles.find({'metadata._Resumable': { $exists: false }})
  });
  myFiles.allow({
    insert: function () {
      return true;
    },
    remove: function () {
      return true;
    },
    read: function () {
      return true
    },
    write: function () {
      return true
    }
  });
}

if (Meteor.isClient) {
  Meteor.subscribe("myFiles");

  Meteor.startup(function() {

    // enable assign action to a DOM
    myFiles.resumable.assignDrop($(".fileDrop"));

    //enable browse action to a DOM
    myFiles.resumable.assignBrowse($(".fileBrowse"));

    // listen to the fileAdded dom node
    myFiles.resumable.on('fileAdded', function (file) {
      Session.set(file.uniqueIdentifier, 0);
      // new file is added to collection
      myFiles.insert({
          _id: file.uniqueIdentifier,  //
          filename: file.fileName,
          contentType: file.file.type
        },
        function (err, _id) {
          if (err) { return console.error("File creation failed!", err); }
          myFiles.resumable.upload();
        }
      );
    });

    myFiles.resumable.on('fileProgress', function(file){
      console.log(Math.floor(100 * file.progress()));
      Session.set(file.uniqueIdentifier, Math.floor(100 * file.progress()));
    });

    myFiles.resumable.on('fileSuccess', function(file){
      Session.set(file.uniqueIdentifier, undefined);
    });
  });

  Template.collTest.events({
    'click .del-file': function(e, t){
      myFiles.remove( {_id: this._id});
    }
  });

  Template.collTest.helpers({
    dataEntries: function() {
      return myFiles.find({});
    },

    shortFilename: function(){
      return this.filename;
    },

    id: function(){
     return this._id._str;
    },

    isImage: function() {
      var types;
      types = {
        'image/jpeg': true,
        'image/png': true,
        'image/gif': true,
        'image/tiff': true
      };
      return types[this.contentType] != null;
    },

    link: function() {
      return myFiles.baseURL + "/" + this.md5
    },

    uploadProgress: function(){
      var percent;
      percent = Session.get(this._id._str);
      return percent;
    },

    uploadStatus: function(){
      percent = Session.get(this._id._str);
      if(percent){
       'processing....'
      }else{
        'uploading.....'
      }
    },

    formattedLength: function() {
     return numeral(this.length).format('0.0b');
    }
  });
}
