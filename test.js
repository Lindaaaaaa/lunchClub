var Slack = require('slack-client');
var fs = require('fs');
var restaurantList = require('./restaurants.json');
var userList = JSON.parse(fs.readFileSync('users.json', 'utf8'));

var slackToken = 'xoxb-15057097734-N0REESK80Jetfe4aiXaMoEQ4';
var autoReconnect = true;
var autoMark = true;
var messageNum = 0;

var slack = new Slack(slackToken, autoReconnect, autoMark);

var channel;



/* --------------------------------------- CONTENT STARTS HERE ------------------------------------ */

var idealTeamSize = 5;
var foodAndDrinks = ["green_apple", "apple", "pear", "tangerine", "lemon", "banana", "watermelon", "grapes", "strawberry", "melon", "cherries", "peach", "pineapple", "tomato", "eggplant", "hot_pepper", "corn", "sweer_potato", "honey_pot", "bread", "cheese_wedge", "poultry_leg", "meat_on_bone", "fried_shrimp", "egg", "hamburger", "fries", "hotdog", "pizza", "spaghetti", "taco", "burrito", "ramen", "stew", "fish_cake", "sushi", "bento", "curry", "rice_ball", "rice", "rice_cracker", "oden", "dango", "shaved_ice", "ice_cream", "icecream", "cake", "birthday", "custard", "candy", "lollipop", "chocolate_bar", "popcorn", "doughnut", "cookie", "beer", "beers", "wine_glass", "cocktail", "tropical_drink", "champagne", "sake", "tea", "coffee", "baby_bottle", "fork_and_knife", "knife_fork_plate"];

/* refresh the list of users */
var refresh = function() {
	userList = JSON.parse(fs.readFileSync('users.json', 'utf8'));
};

/* create and populate teams with captains and members */
/* also handles prioritizing the captains for the next date */
var populateTeam = function(users, n) {
	/* sort in order of highest priority to become captain */
	users.sort(function(a, b){
		if(a.coop) return 1;
		if(b.coop) return -1;
		if(a.priority < b.priority) return -1;
		if(a.priority > b.priority) return 1;
		return 0;
	});

	var teams = [];
	/* choose captains */
	for (var i=0; i<n; i++) {
		var team = {captain: users[0].name, members: []};
		users.splice(0,1);
		teams.push(team);
	}

	/* choose members */
	i=0;
	while (users.length!==0) {
		var rand =  Math.floor(Math.random() * (users.length - 0)) + 0;
		teams[i].members.push(users[rand].name);
		users.splice(rand, 1);

		i++;
		if (i==n)
			i=0;
	}

	/* change priorities */
	for (var i=0; i<userList.length; i++) {
		var captain = false;
		for (var j=0; j<teams.length; j++) {
			/* lower priority of captains */
			if (userList[i].name == teams[j].captain) {
				userList[i].priority += teams[j].members.length;
				captain = true;
				break;
			}
		}
		/* raise priority of members */
		if (!captain && userList[i].attending && !userList[i].coop)
			userList[i].priority--;
	}

	return teams;
};

/* only look at users who are attending */
/* call helper functions to populate the teams */
var createTeams = function() {
	var attending = [];
	/* remove the users who are not attending */
	userList.forEach( function(user) {
		if (user.attending)
			attending.push(user);
	});

	var n = attending.length;
	var numTeams = Math.floor(n/idealTeamSize);
	var rem = n%idealTeamSize;

	/* if you need to add more than 1 person to each team, add another team */
	/* rem>2 is there so that we don't have any teams with less than 4 people */
	if (numTeams==0 || (rem/numTeams>1 && rem>2))
		numTeams++;

	return populateTeam(attending, numTeams);
};

/* add random Food and Drink Emoji */
var addEmoji = function() {
	var rand =  Math.floor(Math.random() * (foodAndDrinks.length - 0)) + 0;
	var message = ":" + foodAndDrinks[rand] + ":";

	return message;
};

/* save log */
var saveLog = function(message) {
	var log = fs.readFileSync("./log.txt");
	var m = message.replace(/\`\`\`/g,"").replace(/\>\>\>/g, "").replace(/\*/g, "");

	var d = new Date();
	log += d.getMonth() + "." + d.getDate() + "." + d.getFullYear() + "\n" + m + "\n";

	/* erase old log if more than 100 lines */
	if (log.split("\n").length>100) {
		log = log.split("\n");

		while (log.length>100)
			log.splice(0, 1);

		log = log.join("\n");
	}

	fs.writeFile("./log.txt", log, { flags: 'wx' }, function (err) {
		if (err) throw err;
		console.log("log saved");

	});
};

/* write teams to Slack */
var writeMessage = function(teams) {
	var message = "";

	for (var i=0; i<teams.length; i++) {
		var team = teams[i];
		message += "Group *" + team.captain + "*: ";
		for (var j=0; j<team.members.length; j++) {
			message += team.members[j];
			if (j!==team.members.length-1)
				message += ", ";
		}
		message += "\n";
	}

	channel.send("Lunch Time!!!!!!!!!" + addEmoji() + "\n>>>" + message);
	saveLog(message);
};

/* Save the modified user list to the JSON file */
var saveList = function() {
	fs.writeFile("./users.json", JSON.stringify(userList), function(err) {
		if (err)
			return console.log(err);
		console.log("JSON file saved");
	});
};

/* generate the groupds */
var generateGroups = function() {
	refresh();

	var d = new Date();
	var date = d.getMonth() + "." + d.getDate() + "." + d.getFullYear();

	/* read log to prevent from generating lunch break twice */
	fs.readFile("log.txt", 'utf8', function(err, data) {
		if (err) 
			console.log(err);
		console.log('reading log');

		if (data!=="") {


			var dates = data.match(/\d+\.\d+\.\d+\n\w{5}/g);
			var text = dates[dates.length-1].slice(-5);
			var lastDate = dates[dates.length-1].match(/\d+\.\d+\.\d+/g);

            if (d.getDay()!==5 ) {
			   channel.send("Lunch club is on Friday only...Sorry:(");
			   return;
			}



			if (date==lastDate && text=="Group") {
				channel.send("A lunch club group was already generated today. Please try again tomorrow. :simple_smile:");
				return;
			}
		}

		var teams = createTeams();
		writeMessage(teams);
		saveList();
	});
};

/* reset all priorities to 0 */
var clearPriorities = function(name) {
	for (var i=0; i<userList.length; i++) {
		userList[i].priority = 0;
	}

	var message = "Priorities were reset to zero by " + name; 
	channel.send(message + ". ...I hope that was approved by everyone? :worried:");
	lastDateGenerated = 0;
	saveLog(message + "\n");
	saveList();
};

/* get log */
var getLog = function(blurb) {
	var message;
	if (blurb.indexOf("showmethelog")>-1)
		message = "Here ";
	else
		message = "Calm down...there must be a reason. FYI, here ";

	fs.readFile("log.txt", 'utf8', function(err, data) {
		if (err) 
			console.log(err);
		console.log('reading log');

		channel.send(message + "is the log: \n" + "```" + data + "```");
	});
};

/* show the list of people in order of attendace status */
var showListOfPeople = function() {
	refresh();

	var attending = [];
	var absent = [];

	/* divide the people into 2 groups based on attendance */
	for (var i=0; i<userList.length; i++) {
		if (userList[i].attending)
			attending.push(userList[i]);
		else
			absent.push(userList[i]);
	}

	var message = "Taking attendance!!!\n>>>*Here*: "
	for (var i=0; i<attending.length; i++) {
		message += attending[i].name;
		if (i!=attending.length-1)
			message += ", ";
	}

	message += "\n*Absent*: "
	for (var i=0; i<absent.length; i++) {
		message += absent[i].name;
		if (i!=absent.length-1)
			message += ", ";
	}

	channel.send(message);
};

/* find index of name inside list */
/* return -1 if not found */
var findIndex = function(list, name) {
	for (var i=0; i<list.length; i++) {
		if (list[i].name.toLowerCase()==name.toLowerCase())
			return i;
	}
	return -1;
};

/* change the attendance status of the users to bool */
var changeAttendance = function(users, bool) {
	users = users.split(",");

	for (var i=0; i<users.length; i++) {
		var j = findIndex(userList, users[i]);
		if (j!=-1) {
			userList[j].attending = bool;
		}
	}
	saveList();
	showListOfPeople();
};

/* add new users to the userList */
var addPeople = function(users, bool) {
	users = users.split(",");

	/* check if the name already exists */
	for (var i=0; i<users.length; i++) {
		var name = users[i].toLowerCase();
		for (var j=0; j<userList.length; j++) {
			if (name==userList[j].name.toLowerCase()) {
				channel.send("One or more of the names already exist. Please modify.");
				return;
			}
		}
	}

	for (var i=0; i<users.length; i++) {
		var name = users[i].charAt(0).toUpperCase() + users[i].slice(1);
		var user = {name: name, coop: bool, priority: 0, attending: true};
		userList.push(user);

		channel.send("Hello, " + name);
	}

	/* sort by name */
	userList.sort(function(a, b){
		if(a.name < b.name) return -1;
		if(a.name > b.name) return 1;
		return 0;
	});
	saveList();
};

/* remove a user from the userList */
var removePeople = function(users) {
	users = users.split(",");
	console.log(users);

	for (var i=0; i<users.length; i++) {
		var j = findIndex(userList, users[i]);
		if (j!=-1) {
			channel.send("Good-bye, " + userList[j].name + ' (≧◇≦)ﾉ(TωT)ﾉ"');
			userList.splice(j, 1);
		}
	}
	saveList();
};


/* --------------------- HELPER FUNCTIONS FOR RESTAURANT FUNCTIONALITIES ---------------------*/

var names;
var restaurant = {};

var getRestaurantName = function(blurb) {
	var name = blurb.charAt(0).toUpperCase() + blurb.slice(1);
	restaurant.name = name;
	isRestaurant=false;

	var i = findIndex(restaurantList, name);
	if (i==-1) {
		channel.send("Enter some keywords for this restaurant. E.g. Coffee, Chinese...etc.\n(Please separate keywords by commas)");
		isKeywords = true;
	}
	else {
		isRating=true;
		channel.send("How did you like " + name + "? Please rate it from 0-5.");
	}
};

var getRestaurantKeywords = function(blurb) {
	blurb = blurb.split(",");
	restaurant.keywords = blurb;
	isKeywords = false;
	isRating = true;
	channel.send("Thank you! How did you like " + restaurant.name + "? Please rate it from 0-5.");

};

var getRestaurantRating = function(blurb) {
	var r = parseInt(blurb);
	console.log(r);
	rounded=round(r,12);
	console.log(rounded);
	var i = findIndex(restaurantList, restaurant.name);

	if (r<0 || r>5)
		channel.send("Please enter a rating between 0-5.");
	else {
		if(r<3 && r>=0)
			channel.send("Looks Like you were poisoned");
		else
			channel.send("LuckyLucky, you were not poisoned");

		isRating = false;

		if (i==-1) {
			restaurant.rating = r;
			restaurant.rated = 1;
			restaurantList.push(restaurant);
			restaurant = {};
		}
		else {
			restaurantList[i].rated = restaurantList[i].rated+1;
			restaurantList[i].rating = (restaurantList[i].rating + rounded)/restaurantList[i].rated;
		}

		/* sort by name */
		restaurantList.sort(function(a, b){
			if(a.name < b.name) return -1;
			if(a.name > b.name) return 1;
			return 0;
		});

		fs.writeFile("./restaurantList.json", JSON.stringify(restaurantList), function(err) {
			if (err)
				return console.log(err);
			console.log("JSON file saved");
		});
	}
};



/* ------------------------------ CONNECTIONS TO SLACK ----------------------------------------- */


var confirmRemove = false;
var confirmClear = false;
var isRestaurant = false;
var isKeywords = false;
var isRating=false;

slack.on('open', function(){
	channel = slack.getChannelGroupOrDMByID("G0F1EAXDL"); /* default channel set to lunch-club */
});

/* answers to messages */
slack.on('message', function(message){
	/* if the message has no text attribute (ex. when a message is deleted) */
	if (!message.hasOwnProperty("text"))
		return;

	/* send to the channel in which the message was sent from */
	channel = slack.getChannelGroupOrDMByID(message.channel);

	var blurb = message.text.toLowerCase().replace(/ /g, "").replace(/[\.\?\!\@\#\$\%\^\&\*\(\)\-\_\+\=\,\/\<\>\{\}\[\]\|\\\:\;\"\'\~\`]/g, "");

	/* confirm to remove a person */
	if (confirmRemove) {
		switch (blurb) {
			case ("yes"):
			removePeople(names);
			confirmRemove = false;
			break;
			case ("no" || "cancel"):
			confirmRemove = false;
			break;
			default:
			channel.send("Please enter yes or no");
			break;
		}
	}
	/* confirm to clear priorities */
	else if (confirmClear) {
		switch (blurb) {
			case ("yes"):
			clearPriorities(slack.getUserByID(message.user).name);
			confirmClear = false;
			break;
			case ("no" || "cancel"):
			confirmClear = false;
			break;
			default:
			channel.send("Please enter yes or no");
			break;
		}
	}

	/* add restaurant info */
	else if (isRestaurant)
		getRestaurantName(blurb);
	/* add restaurant info */
	else if (isKeywords)
		getRestaurantKeywords(blurb);
	/* add restaurant info */
	else if (isRating)
		getRestaurantRating(blurb);

	/* default */
	else {
		switch (true) {
			case (blurb=="help"):
			channel.send("Lunchbot to the rescue!!! Here is the list of commands:\n>>>*What time is it Mr. Bot?* = Generate lunch club groups\n*Clear priorities* = Clear all priorities (DO WITH CARE!)\n*Show me the log* = Show lunchbot log\n\n*List all restaurants* = List all restaurants that have been logged\n*Log restaurant* = Make a log of the restaurant you went to\n*Find me some ___ (enter ONE keyword)* = Finds restaurants based on keyword\n(eg. Find me some sushi)\n\n*Who's here?* = Shows the list of peope\n*Absents ___* = Set absent people (separate names by commas)\n(eg. Absents Chewy, Indy)\n*Attendees ___* = Set people attending (separate names by commas)\n(eg. Atendees Chewy, Indy)\n*Say hello to new members ___* = Add new members (separate names by commas)\n(eg. Say hello to new members Chewy, Indy)\n*Say hello to new coops ___* = Add new coops (separate names by commas)\n(eg. Say hello to new coops Chewy, Indy)\n*Say good-bye to ___* = Remove members (separate names by commas)\n(eg. Say good-bye to Chewy, Indy)");
			break;

			case (blurb.indexOf("hilunchbot")>-1 || blurb.indexOf("hellolunchbot")>-1):
			channel.send("Hi " + slack.getUserByID(message.user).name + "!");
			break;

			case (blurb.indexOf("whattimeisitmrbot")>-1):
			var h = new Date().getHours();
			if (h>9 && h<16)
				generateGroups();
			else if (h>=16 && h<24)
				channel.send("Beer-o-clock! :beers:");
			break;

			case (blurb=="clearpriorities"):
			channel.send("Are you sure? Changes cannot be undone.");
			confirmClear = true;
			break;

			case (blurb.indexOf("showmethelog")>-1 || blurb.indexOf("ijustpaid")>-1 || blurb.indexOf("mealready?")>-1 || blurb.indexOf("myturnalready?")>-1):
			getLog(blurb);
			break;

			case (blurb.indexOf("whoshere")>-1):
			showListOfPeople();
			break;

			case (blurb.indexOf("absents")>-1):
			var users = blurb.replace("absents", "");
			changeAttendance(users, false);
			break;

			case (blurb.indexOf("attendees")>-1):
			var users = blurb.replace("attendees", "");
			changeAttendance(users, true);
			break;

			case (blurb.indexOf("sayhellotonewmembers")>-1):
			var users = blurb.replace("sayhellotonewmembers", "");
			addPeople(users, false);
			break;

			case (blurb.indexOf("sayhellotonewcoops")>-1):
			var users = blurb.replace("sayhellotonewcoops", "");
			addPeople(users, true);
			break;

			case (blurb.indexOf("saygoodbyeto")>-1):
			channel.send("Are you sure?");
			confirmRemove = true;
			names = blurb.replace("saygoodbyeto", "");
			break;

			case(blurb.indexOf("logrestaurant")>-1):
			channel.send("Where did you go? Please enter the name.");
			isRestaurant=true;
			break;

			case(blurb.indexOf("findmesome")>-1):
			var keyword = blurb.replace("findmesome", "");
			var info = "Here are my suggestions: https://www.google.ca/maps/search/" + keyword + "/@49.2680058,-123.1432304,15.78z\nHere are some restaurants your colleagues have been to:\n>>>"

			for (var i=0; i<restaurantList.length; i++) {
				var r = restaurantList[i];
				var keywords = r.keywords
				for (var j=0; j<keywords.length; j++) {
					if (keywords[j].toLowerCase()==keyword.toLowerCase()) {
						info += "*" + r.name + "* - Rated a " + r.rating + "/5 by " + r.rated + " people\n"
					}
				}
			}
			channel.send(info);
			break;

			case(blurb.indexOf("listallrestaurants")>-1):
			var info = "Here are the list of restaurants your colleagues have been to:\n>>>";

			for (var i=0; i<restaurantList.length; i++) {
				var r = restaurantList[i];
				info += "*" + r.name + "* - Rated a " + r.rating + "/5 by " + r.rated + " people\n"
			}
			channel.send(info);
			break;

			case (blurb.indexOf("howareyou")>-1):
			channel.send("Fine thank you. And you? :simple_smile:");
			break;

			case (blurb=="iamyourfather"):
			channel.send("NOOOOOOOOOOOOOOOOOOOOOOOO!!!!!!!!!!!!!!");
			break;

			case (blurb.indexOf("imtired")>-1):
			channel.send("You can do it!  ( ๑´•ω•)۶”(´•ω•｀) patpat");
			break;

			case (blurb.indexOf("imhungry")>-1):
			channel.send("How about a snack break?");
			break;

			case (blurb.indexOf("imsleepy")>-1):
			channel.send("Are you alright? How about a coffee break? ( ´・ω・`)_且~~");
			break;

			case (blurb.indexOf("indy")>-1 || blurb.indexOf("chewy")>-1):
			channel.send("woof! :dog2:");
			break;

			case (blurb.indexOf("lunchbot")>-1):
			channel.send("Did you call me? If you need anything, please type 'help'");
			break;

			default:
			while (blurb.indexOf("ooo")>-1)
				blurb = blurb.replace("ooo", "oo");
			if (blurb.indexOf("food")>-1)
				channel.send(addEmoji());
			break;
		}
	}


});

slack.on('error', function(err){
	console.error("Error", err);
});

slack.login();
