if(global){
    Object.defineProperty(global,'__stack__',{
	    get:function() {
		var orig = Error.prepareStackTrace;
		Error.prepareStackTrace = function(_, stack) {
		    return stack;
		};
		var err = new Error;
		Error.captureStackTrace(err, arguments.callee);
		var stack = err.stack;
		Error.prepareStackTrace = orig;
		return stack;
	    }
	});

    Object.defineProperty(global, '__file__', {
	    get: function(){
		return __stack__[3].getFileName();
	    }
	});

    Object.defineProperty(global,'__line__',{
	    get:function(){
		return __stack__[3].getLineNumber();
	    }
	});

    Object.defineProperty(global,'__function__',{
	    get:function(){
		return __stack__[3].getFunctionName();
	    }
	});



    global.isString = function(arg){
	return arg.constructor.toString().match(/String/);
    }

    global.isJSON = function(arg){
	try{
	    if(arg.constructor.toString().match(/Object/)){
		var aux = JSON.stringify(arg);
		return global.isString(aux);
	    }else if(global.isString(arg)){
		var aux = JSON.parse(arg);
		return aux.constructor.toString().match(/Object/);
	    }
	    return false;
	}catch(e){
	    return false;
	}
    }
}
function Logger(program_name,pid,default_log_level,template){
    this.syslog = require('modern-syslog');
    this.pn = program_name;
    this.pid = pid;
    this.default_log_level = default_log_level;
    this.template = template || "%s";
    this.LEVELS = [{code:undefined,str:""}, // LOG_EMERGE
		   {code:undefined,str:""}, // LOG_ALERT
		   {code:60,str:"CRITICAL"},// LOG_CRIT
		   {code:40,str:"ERROR"},   // LOG_ERR
		   {code:30,str:"WARNING"}, // LOG_WARNING
		   {code:undefined,str:""}, // LOG_NOTICE
		   {code:20,str:"INFO"},    // LOG_INFO
		   {code:10,str:"DEBUG"}]   // LOG_DEBUG
	}

Logger.prototype = {
    write:function(level,message,callback){
	if(isJSON(message)){
	    if(isString(message)){
		message = JSON.parse(message);
	    }
	}else if(isString(message)){
	    message = {"message":message};
	}
	message.priority = this.LEVELS[level].code;
	message.priority_name = this.LEVELS[level].str;
	message.process_name = this.pn;
	message.process = this.pid;
	message.file = __file__;
	message.func = __function__;
	message.line = __line__;
	message.timestamp = new Date().toISOString().replace(/T/,' ').replace(/Z/,'');
	message = JSON.stringify(message);
	if(this.LEVELS[level].code>=this.default_log_level)
	    this.syslog.log(level,message,callback);
    },
    debug:function(message,callback){
	this.write(this.syslog.LOG_DEBUG,message,callback);
    },
    warning:function(message,callback){
	this.write(this.syslog.LOG_WARNING,message,callback);
    },
    error:function(message,callback){
	this.write(this.syslog.LOG_ERR,message,callback);
    },
    critical:function(message,callback){
	this.write(this.syslog.LOG_CRIT,message,callback);
    },
    info:function(message,callback){
	this.write(this.syslog.LOG_INFO,message,callback);
    },
    open:function(){
	this.syslog.open(this.pn);
    },
    close:function(){
	this.syslog.close();
    }
}


exports.Logger = Logger