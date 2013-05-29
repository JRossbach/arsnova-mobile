/*--------------------------------------------------------------------------+
 This file is part of ARSnova.
 app.js
 - Beschreibung: Einstiegsseite für ARSnova.
 - Version:      1.0, 01/05/12
 - Autor(en):    Christian Thomas Weber <christian.t.weber@gmail.com>
 +---------------------------------------------------------------------------+
 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU General Public License
 as published by the Free Software Foundation; either version 2
 of the License, or any later version.
 +---------------------------------------------------------------------------+
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 +--------------------------------------------------------------------------*/

Ext.application({
	
	requires: ['ARSnova.proxy.RestProxy'],

    name: "ARSnova",
    /* const */
    WEBAPP			: 'webapp',
    NATIVE			: 'native',
    APP_URL			: window.location.origin + window.location.pathname,
    WEBSERVICE_URL	: "app/webservices/",
    
	LOGIN_GUEST		: "0",
	LOGIN_THM		: "1",
	LOGIN_OPENID	: "2",
	LOGIN_TWITTER	: "3",
	LOGIN_FACEBOOK	: "4",
	LOGIN_GOOGLE	: "5",
	
	USER_ROLE_STUDENT: "0",
	USER_ROLE_SPEAKER: "1",
	
	CANTEEN_LOCATION: "THM Mensa Gießen",
	CANTEEN_DAY		: "01.03.2013",
    
    isIconPrecomposed: true,
    icon: 'resources/images/ARSnova_Grafiken/01_AppIcon_114x114px.png',

    models: [].concat(
    		['Answer', 'Config', 'Feedback', 'FoodVote', 'LoggedIn', 'Question', 'Session', 'Statistic', 'Course'],
    		['Auth', 'FeedbackQuestion']),
    
    views: [].concat(
    		
    		/* app/view */
    		['Caption', 'CheckFullscreenPanel', 'LoginPanel', 'MainTabPanel', 'TabPanel', 'RolePanel', 'MathJaxField'], 
    		['MathJaxMessageBox', 'MultiBadgeButton', 'NumericKeypad', 'FreetextAnswerPanel', 'FreetextDetailAnswer'],
    		['FreetextQuestion', 'Question', 'QuestionStatusButton', 'SessionStatusButton', 'CustomMask'],
    		
    		/* app/view/about */
    		['about.AboutPanel', 'about.ARSinLessonPanel', 'about.ARSPanel', 'about.CreditsPanel', 'about.HelpCanteenPanel'],
    		['about.HelpDeskPanel', 'about.HelpFeedbackPanel', 'about.HelpHomePanel', 'about.HelpMainPanel'],
    		['about.HelpQuestionsPanel', 'about.HelpVideoPanel', 'about.ImpressumPanel', 'about.InfoPanel'],
    		['about.OpenSourceProjectsPanel', 'about.SocialSoftwarePanel', 'about.SponsorsPanel', 'about.StatisticPanel'],
    		['about.TabPanel'],
    		
    		/* app/view/archive */
    		['archive.CoursePanel', 'archive.QuestionPanel', 'archive.TabPanel'],
    		
    		/* app/view/canteen */
    		['canteen.StatisticPanel', 'canteen.TabPanel', 'canteen.VotePanel'],
    		
    		/* app/view/feedback */
    		['feedback.AskPanel', 'feedback.StatisticPanel', 'feedback.TabPanel', 'feedback.VotePanel'],
    		
    		/* app/view/feedbackQuestions */
    		['feedbackQuestions.DetailsPanel', 'feedbackQuestions.QuestionsPanel', 'feedbackQuestions.TabPanel'],
    		
    		/* app/view/home */  
    		['home.HomePanel', 'home.MySessionsPanel', 'home.NewSessionPanel', 'home.TabPanel'],
    		
    		/* app/view/speaker */
    		['speaker.AudienceQuestionPanel', 'speaker.InClass', 'speaker.NewQuestionPanel', 'speaker.QuestionDetailsPanel'],
    		['speaker.QuestionStatisticChart', 'speaker.ShowcaseQuestionPanel', 'speaker.TabPanel'],
    		
    		/* app/view/user */
    		['user.InClass', 'user.QuestionPanel', 'user.RankingPanel', 'user.TabPanel']),
	
    controllers: ['Archive', 'Auth', 'Canteen', 'Feedback', 'Lang', 'Questions', 'Ranking', 'Sessions', 'User'],
    
    stores: ['Food'],
    
    /* items */
    mainTabPanel: null,
    tabPanel	: null,
    loginPanel	: null,
    loadingMask : null,
    taskManager	: null,
    previousActiveItem: null,
    
    /* infos */
    loginMode		: null,  /* ARSnova.app.LOGIN_GUEST, ... */
    appStatus		: null,	 /* ARSnova.app.WEBAPP || ARSnova.app.NATIVE */
    isSessionOwner	: false, /* boolean */
    loggedIn		: false, /* boolean */
    userRole		: null,  /* ARSnova.app.USER_ROLE_STUDENT || ARSnova.app.USER_ROLE_SPEAKER */
    isNative		: function () { return this.appStatus === this.NATIVE; },
    isWebApp		: function () { return this.appStatus === this.WEBAPP; },
    
    /* models */
    answerModel 	: null,
    feedbackModel	: null,
    foodVoteModel	: null,
    loggedInModel	: null,
    questionModel	: null,
    sessionModel 	: null,
    statisticModel 	: null,
    userRankingModel: null,
    courseModel     : null,
    
    /* proxy */
	restProxy		: null,
	
    /* other*/
    cardSwitchDuration: 500,
    
    /* tasks */
    
    /**
     * delete feedbacks that can be removed
     */
    cleanFeedbackVotes: {
    	name: 'looking for feedbacks that have to be remove',
		run: function(){
			ARSnova.app.restProxy.cleanSessionFeedback();
		},
		interval: 60000 //60 seconds
	},
	
	/**
	 * update every x seconds the user timestamp
	 * important for all "who is online"-requests
	 */
	loggedInTask: {
		name: 'save that user is logged in',
		run: function(){
			ARSnova.app.restProxy.loggedInTask();
		},
		interval: 60000 //60 seconds
	},
	
	/**
	 * update every x seconds the owner of a session is logged in
	 */
	updateSessionActivityTask: {
		name: 'save that owner of a session is logged in',
		run: function(){
			ARSnova.app.restProxy.updateSessionActivityTask();
		},
		interval: 180000 //180 seconds
	},
	
    /**
     * initialize models
     */
    initModels: function() {
    	this.answerModel 		= Ext.create('ARSnova.model.Answer');
    	this.authModel			= Ext.create('ARSnova.model.Auth');
    	this.feedbackModel		= Ext.create('ARSnova.model.Feedback');
    	this.foodVoteModel		= Ext.create('ARSnova.model.FoodVote');
    	this.loggedInModel		= Ext.create('ARSnova.model.LoggedIn');
    	this.questionModel		= Ext.create('ARSnova.model.Question');
    	this.sessionModel		= Ext.create('ARSnova.model.Session');
    	this.statisticModel 	= Ext.create('ARSnova.model.Statistic');
    	// this.userRankingModel	= Ext.create('ARSnova.model.UserRanking');
    	this.courseModel		= Ext.create('ARSnova.model.Course');
    },
    
    /**
     * This is called automatically when the page loads. Here we set up the main component on the page
     */
    launch: function(){
    	// Use native application update depending on manifest file changes on startup
		var appCache = window.applicationCache;
		if (appCache.status !== appCache.UNCACHED) {
			appCache.update();
		}
		
		window.addEventListener('load', function(e) {
			window.applicationCache.addEventListener('updateready', function(e) {
				if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
					// New version of ARSnova detected, swap in new chache
					window.applicationCache.swapCache();
					Ext.Msg.confirm(Messages.NEW_VERSION_TITLE, Messages.NEW_VERSION_AVAILABLE, function(answer) {
						if (answer == 'yes') {
							window.location.reload();
						}
					});
				}
			}, false);
		}, false);
    	
		if (!this.checkWebKit()) return;
		if (!this.checkLocalStorage()) return;
		this.checkEstudyURL();
		this.setupAppStatus();
		
		taskManager = new Ext.util.TaskRunner();
		
		this.initModels();
		this.restProxy = Ext.create('ARSnova.proxy.RestProxy'); 
		this.mainTabPanel = Ext.create('ARSnova.view.MainTabPanel');
		
		this.checkPreviousLogin();
		this.checkFullscreen();
	},

	setupAppStatus: function() {
		this.appStatus = (navigator.device == null) ? this.WEBAPP : this.NATIVE;
	},

	/**
	 * check browser-engine
	 */
	checkWebKit: function() {
		var result = /AppleWebKit\/([\d.]+)/.exec(navigator.userAgent);
		if (!result) {
			alert(Messages.SUPPORTED_BROWSERES);
			return false;
		} else {
			return true;
		}
	},
	
	/**
	 * Detect: If the application is not run in full screen mode on an apple
	 * device, notify user how to add app to home screen for full screen mode.
	 */ 
	checkFullscreen: function(){
		if (localStorage.getItem('html5 info read') == null){
			if (!this.popup){
				this.popup = Ext.create('ARSnova.view.CheckFullscreenPanel');
				Ext.Viewport.add(this.popup);
			}
			
			this.popup.show('fade');
		}
	},
	
	/**
	 * after user has logged in
	 * start some tasks and show the correct homepage to user
	 */
	afterLogin: function(){
		taskManager.start(ARSnova.app.loggedInTask);
		taskManager.start(ARSnova.app.mainTabPanel.tabPanel.canteenTabPanel.statisticPanel.updateCanteenBadgeIconTask);
		
		ARSnova.app.mainTabPanel.tabPanel.animateActiveItem(ARSnova.app.mainTabPanel.tabPanel.homeTabPanel, 'slide');
		var hTP = ARSnova.app.mainTabPanel.tabPanel.homeTabPanel;
		switch (ARSnova.app.userRole) {
			case ARSnova.app.USER_ROLE_STUDENT:
				hTP.homePanel.checkLogin();
				hTP.setActiveItem(hTP.homePanel);
				break;
			case ARSnova.app.USER_ROLE_SPEAKER:
				hTP.setActiveItem(hTP.mySessionsPanel);
				break;
			default:
				break;
		}
		
		if (localStorage.getItem("keyword") !== null && localStorage.getItem("keyword") !== "") {
			return ARSnova.app.getController('Sessions').login({
				keyword: localStorage.getItem("keyword")
			});
		}
    },
    
    /**
     * returns true if user is logged in a session
     */
    checkSessionLogin: function(){
    	if(localStorage.getItem('sessionId') == undefined || localStorage.getItem('sessionId') == "")
    		return false;
    	else
    		return true;		// TODO: canteen ...
    },
    
    getGetVariable: function(variable){
    	HTTP_GET_VARS = new Array();
    	strGET = document.location.search.substr(1,document.location.search.length);
    	if(strGET != ''){
    	    gArr = strGET.split('&');
    	    for(i = 0; i < gArr.length; ++i){
    	        v = '';
    	        vArr = gArr[i].split('=');
    	        if(vArr.length > 1){
    	        	v = vArr[1];
    	        }
    	        HTTP_GET_VARS[unescape(vArr[0])] = unescape(v);
	        }
	    }
    	
    	if(!HTTP_GET_VARS[variable]){
    		return 'undefined';
    	} else {
			return HTTP_GET_VARS[variable];
    	}
    },
	
	checkPreviousLogin: function(){
		var isLocalStorageUninitialized = localStorage.getItem('role') == null
									   || localStorage.getItem('loginMode') == null
									   || localStorage.getItem('login') == null;
		if (isLocalStorageUninitialized) return false;
		
		ARSnova.app.loggedIn = true;
		ARSnova.app.loginMode = localStorage.getItem('loginMode');
		ARSnova.app.userRole = localStorage.getItem('role');
		ARSnova.app.setWindowTitle();
		ARSnova.app.afterLogin();
	},

    setWindowTitle: function(){
		switch (ARSnova.app.userRole) {
			case ARSnova.app.USER_ROLE_SPEAKER:
				window.document.title = "ARSnova: Dozent/in";
				break;
			case ARSnova.app.USER_ROLE_STUDENT:
				window.document.title = "ARSnova: Zuhörer/in";
				break;
			default:
				window.document.title = "ARSnova";
				break;
		}
    },
    
    /**
     * Wrapper for an invidivudal LoadMask
     */
    showLoadMask: function(message){
    	this.loadingMask = new Ext.LoadMask({
    		message: message || ""
    	});
    	Ext.Viewport.add(this.loadingMask);
    	this.loadingMask.show();
    	setTimeout("ARSnova.app.hideLoadMask()", 5000); // hide this mask after 5 seconds automatically
    },
    
    /**
     * Wrapper for an invidivudal LoadMask
     */
    hideLoadMask: function(){
    	if(this.loadingMask){
    		clearTimeout("ARSnova.app.hideLoadMask()", 5000);
    		this.loadingMask.hide();
	    	this.loadingMask.destroy();
    	}
    },
    
    /**
     * clear local storage
     */
    cleanLocalStorage: function(){
    	localStorage.clear();
    },
    
    /**
     * check if string is valid json
     */
    isJsonString: function(str){
        try {
            JSON.parse(str);
        } catch (e){
            return false;
        }
        return true;
    },
    
    /**
     * for correct protocol, if arsnova is called inside estudy
     */
    checkEstudyURL: function(){
    	if (window.location.host.indexOf("estudy") != -1 && window.location.protocol == "http:"){
    		window.location = "https://" + window.location.hostname + "/arsnova";
    	}
    },
    
    /**
     * make localStorage ready 
     */
    checkLocalStorage: function(){
		if (localStorage.getItem('lastVisitedSessions') == null){
			localStorage.setItem('lastVisitedSessions', "[]");
		}
		
		if (localStorage.getItem('questionIds') == null){
			localStorage.setItem('questionIds', "[]");
		}
		
		if (localStorage.getItem('loggedIn') == null){
			localStorage.setItem('loggedIn', "[]");
		}
		
		if (localStorage.getItem('user has voted')) {
			localStorage.removeItem('user has voted');
		}
		
		if (localStorage.getItem('session')) {
			localStorage.removeItem('session');
		}
    	
		localStorage.setItem('sessionId', "");
		return true;
    },
    
    initFoodStore: function(){
    	var foodStore = Ext.getStore("Food");
    	if(ARSnova.app.config.menu1 != null && ARSnova.app.config.menu1 != "")
    		foodStore.add({
    			name: ARSnova.app.config.menu1,
    			value: 0
    		});
    	if(ARSnova.app.config.menu2 != null && ARSnova.app.config.menu2 != "")
    		foodStore.add({
    			name: ARSnova.app.config.menu2,
    			value: 0
    		});
    	if(ARSnova.app.config.menu3 != null && ARSnova.app.config.menu3 != "")
    		foodStore.add({
    			name: ARSnova.app.config.menu3,
    			value: 0
    		});
    	if(ARSnova.app.config.menu4 != null && ARSnova.app.config.menu4 != "")
    		foodStore.add({
    			name: ARSnova.app.config.menu4,
    			value: 0
    		});
    	if(ARSnova.app.config.menu5 != null && ARSnova.app.config.menu5 != "")
    		foodStore.add({
    			name: ARSnova.app.config.menu5,
    			value: 0
    		});
    },
    
    formatSessionID: function(sessionID){
		var tmp = [];
		for(var i = 0; i < sessionID.length; i++){
			if(i % 2){
				tmp.push(sessionID.substr(i - 1, 2));
			}
		}
		if(tmp.length * 2 < sessionID.length) tmp.push(sessionID[tmp.length * 2]);
		return tmp.join(" ");
	},
	
	removeVisitedSession: function(sessionId){
		var sessions = Ext.decode(localStorage.getItem('lastVisitedSessions'));
		for ( var i = 0; i < sessions.length; i++){
			var session = sessions[i];
			if (sessionId == session._id){
				sessions.splice(i, 1);
			}
		}
		localStorage.setItem('lastVisitedSessions', Ext.encode(sessions));
	}
});

function clone(obj) {
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        var copy = [];
        for (var i = 0; i < obj.length; ++i) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        var copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
};