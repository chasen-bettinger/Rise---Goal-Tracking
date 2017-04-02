  'use strict';
  var Alexa = require("alexa-sdk");
  var appId = ''; //'amzn1.echo-sdk-ams.app.your-skill-id';
  exports.handler = function(event, context, callback) {
      var alexa = Alexa.handler(event, context);
      alexa.appId = appId;
      alexa.dynamoDBTableName = 'goals';
      alexa.registerHandlers(newSessionHandlers, learnNameHandlers, setGoalHandlers, viewGoalHandlers);
      alexa.execute();
  };

  //=========================================================================================================================================
  // States
  //=========================================================================================================================================

  var states = {
      LEARNNAME: '_LEARNNAME', // Alexa will learn the user's name
      SETGOAL: '_SETGOAL', // User is setting their goal
      VIEWGOAL: '_VIEWGOAL', // User is viewing their goal
  };

  //=========================================================================================================================================
  // Additional functions
  //=========================================================================================================================================

  (function() {
      function decimalAdjust(type, value, exp) {
          // If the exp is undefined or zero...
          if (typeof exp === 'undefined' || +exp === 0) {
              return Math[type](value);
          }
          value = +value;
          exp = +exp;
          // If the value is not a number or the exp is not an integer...
          if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
              return NaN;
          }
          // If the value is negative...
          if (value < 0) {
              return -decimalAdjust(type, -value, exp);
          }
          // Shift
          value = value.toString().split('e');
          value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
          // Shift back
          value = value.toString().split('e');
          return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));

      }
      if (!Math.round10) {
          Math.round10 = function(value, exp) {
              return decimalAdjust('round', value, exp);
          };
      }
  })();

  //=========================================================================================================================================
  // Skill Data
  //=========================================================================================================================================]

  var newSessionHandlers = {
      'NewSession': function() {
          if (Object.keys(this.attributes).length === 0) {
              this.attributes['goal'] = '';
              this.attributes['time'] = 0;
              this.attributes['name'] = '';
          }

          if (!this.attributes['name']) {
              this.handler.state = states.LEARNNAME;
              this.emit(':ask', 'Welcome to Rise. I help you accomplish your goals. I don\'t think we\'ve met before. What is your name?',
                  'What is your name?');
          } else if (!this.attributes['goal']) {
              this.handler.state = states.SETGOAL;
              this.emit(':ask', 'Welcome to Rise ' + this.attributes['name'] + '. I help you accomplish your goals. You are not currently working towards a goal. Start by telling me ' +
                  'one thing you would like to accomplish. For example: Set goal read 20 books by December', 'Please tell me what you would like to accomplish');
          } else {
              this.handler.state = states.VIEWGOAL;
              this.emit(':ask', 'Welcome to Rise ' + this.attributes['name'] + '. I help you accomplish your goals. You are currently working towards: ' + this.attributes['goal'] +
                  '. Don\'t give up! Say view to view statistics about your goal, enter to enter time in minutes for your goal, Set goal followed by your new goal to edit your current goal, ' +
                  ' help to receive help, and cancel to quit this skill');
          }
      },
      "AMAZON.StopIntent": function() {
          this.emit(':tell', "Goodbye!");
      },
      "AMAZON.CancelIntent": function() {
          this.emit(':tell', "Goodbye!");
      }
  };

  var learnNameHandlers = Alexa.CreateStateHandler(states.LEARNNAME, {
      'NewSession': function() {
          this.emit('NewSession');
      },
      'LearnNameIntent': function() {
          var myName = this.event.request.intent.slots.myName.value;
          this.attributes['name'] = myName;
          this.emit('NewSession');
      },
      "AMAZON.StopIntent": function() {
          console.log("STOPINTENT");
          this.emit(':tell', "Goodbye!");
      },
      "AMAZON.CancelIntent": function() {
          console.log("CANCELINTENT");
          this.emit(':tell', "Goodbye!");
      },
      'Unhandled': function() {
          console.log("UNHANDLED");
          this.emit(':ask', 'Please tell me your name. For example mark',
              'Please tell me your name. For example cathy');
      }
  });

  var setGoalHandlers = Alexa.CreateStateHandler(states.SETGOAL, {
      'NewSession': function() {
          this.emit('NewSession'); // Uses the handler in newSessionHandlers
      },
      'SetGoalIntent': function() {
          var completionDate = this.event.request.intent.slots.CompletionDate.value;
          var noun = this.event.request.intent.slots.Noun.value;
          this.attributes['goal'] = noun + ' by ' + completionDate;
          this.emit('NewSession');
      },
      'AMAZON.HelpIntent': function() {
          this.emit(':ask', 'Tell me one thing you would like to accomplish. For example: Set goal read 20 books by December',
              'Another example: Set goal learn Python by August');
      },
      "AMAZON.StopIntent": function() {
          console.log("STOPINTENT");
          this.emit(':tell', "Goodbye!");
      },
      "AMAZON.CancelIntent": function() {
          console.log("CANCELINTENT");
          this.emit(':tell', "Goodbye!");
      },
      'Unhandled': function() {
          console.log("UNHANDLED");
          var message = 'Say yes to continue, or no to end the game.';
          this.emit(':ask', 'Tell me one thing you would like to accomplish. For example: Set goal read 20 books by December',
              'Another example: Set goal complete all homework this semester');
      }
  });

  var viewGoalHandlers = Alexa.CreateStateHandler(states.VIEWGOAL, {
      'NewSession': function() {
          this.emit('NewSession'); // Uses the handler in newSessionHandlers
      },
      'ViewGoalIntent': function() {
          if (this.attributes['time'] === 0) {
              this.emit(':ask', 'Oops. It looks like you haven\'t entered any time for your goal yet. Begin by saying Enter followed by the time you\'ve worked on your' +
                  ' goal in minutes', 'Please tell me the amount of time you\'ve been working on your goal');
          } else {
              var timeInHours = Math.round10(this.attributes['time'] / 60, -1);
              this.emit(':ask', 'You have been working on ' + this.attributes['goal'] + ' for ' + timeInHours + ' hours. That\'s ' +
                  Math.round10(timeInHours / 7) + ' hours a week. Do you think Elon Musk, a man that works 80 hours a week, would be impressed?');
          }
      },
      'SetGoalIntent': function() {
          var myGoal = this.event.request.intent.slots.myGoal.value;
          if (myGoal) {
              this.attributes['goal'] = myGoal;
              this.emit(':ask', 'Your new goal is: ' + this.attributes['goal']);
          } else {
              this.emit(':ask', 'Tell me one thing you would like to accomplish. For example: Set goal read 20 books by December ' +
                  'Another example: Set goal complete all homework this semester');
          }
      },
      'AddTimeIntent': function() {
          var time = parseInt(this.event.request.intent.slots.time.value);
          if(time === 0) {
            this.emit(':ask', 'Please say add followed by a number in minutes that you\'d like to add to your goal',
            'Say a number of minutes that you\'d like to add');
          }
          this.attributes['time'] += time;
          this.emit(':ask', 'You just added ' + time.toString() + ' minutes to your goal. Nice work! ');
      },
      'AMAZON.HelpIntent': function() {
          this.emit(':ask', 'Say view to view statistics about your goal, add to add time in minutes to your goal, set goal followed by your new goal to edit your current goal, ' +
          ' help to receive help, and cancel to quit this skill');
      },
      "AMAZON.StopIntent": function() {
          console.log("STOPINTENT");
          this.emit(':tell', "Goodbye!");
      },
      "AMAZON.CancelIntent": function() {
          console.log("CANCELINTENT");
          this.emit(':tell', "Goodbye!");
      },
      'Unhandled': function() {
          console.log("UNHANDLED");
          this.emit(':ask', 'If you\'re unsure of what to do, please say help.',
              'PLease say help');
      }
  });

  // var specificHelp = Alexa.CreateStateHandler(states.HELP, {
  //     'NewSession': function() {
  //         this.emit('NewSession'); // Uses the handler in newSessionHandlers
  //     },
  //     'EnterTimeIntent': function() {
  //         var time = parseInt(this.event.request.intent.slots.time.value);
  //         var timeInMinutes = time / 60;
  //         this.attributes['time'] = timeInMinutes;
  //         this.emit('NewSession');
  //     }
  //     'AMAZON.HelpIntent': function() {
  //         this.emit(':ask', 'Enter your time in minutes. For example: 60 minutes',
  //             'Another example: 130 minutes, which equals 2 hours and 10 minutes');
  //     },
  //     "AMAZON.StopIntent": function() {
  //         console.log("STOPINTENT");
  //         this.emit(':tell', "Goodbye!");
  //     },
  //     "AMAZON.CancelIntent": function() {
  //         console.log("CANCELINTENT");
  //         this.emit(':tell', "Goodbye!");
  //     },
  //     'Unhandled': function() {
  //         console.log("UNHANDLED");
  //         this.emit(':ask', 'Enter your time in minutes. For example: 60 minutes',
  //             'Another example: 130 minutes, which equals 2 hours and 10 minutes');
  //     }
  // })
  //
  // var guessModeHandlers = Alexa.CreateStateHandler(states.GUESSMODE, {
  //     'NewSession': function() {
  //         this.handler.state = '';
  //         this.emitWithState('NewSession'); // Equivalent to the Start Mode NewSession handler
  //     },
  //     'NumberGuessIntent': function() {
  //         var guessNum = parseInt(this.event.request.intent.slots.number.value);
  //         var targetNum = this.attributes["guessNumber"];
  //         console.log('user guessed: ' + guessNum);
  //         if (guessNum > targetNum) {
  //             this.emit('TooHigh', guessNum);
  //         } else if (guessNum < targetNum) {
  //             this.emit('TooLow', guessNum);
  //         } else if (guessNum === targetNum) {
  //             // With a callback, use the arrow function to preserve the correct 'this' context
  //             this.emit('JustRight', () => {
  //                 this.emit(':ask', guessNum.toString() + 'is correct! Would you like to play a new game?',
  //                     'Say yes to start a new game, or no to end the game.');
  //             })
  //         } else {
  //             this.emit('NotANum');
  //         }
  //     },
  //     'AMAZON.HelpIntent': function() {
  //         this.emit(':ask', 'I am thinking of a number between zero and one hundred, try to guess and I will tell you' +
  //             ' if it is higher or lower.', 'Try saying a number.');
  //     },
  //     "AMAZON.StopIntent": function() {
  //         console.log("STOPINTENT");
  //         this.emit(':tell', "Goodbye!");
  //     },
  //     "AMAZON.CancelIntent": function() {
  //         console.log("CANCELINTENT");
  //     },
  //     'SessionEndedRequest': function() {
  //         console.log("SESSIONENDEDREQUEST");
  //         this.attributes['endedSessionCount'] += 1;
  //         this.emit(':tell', "Goodbye!");
  //     },
  //     'Unhandled': function() {
  //         console.log("UNHANDLED");
  //         this.emit(':ask', 'Sorry, I didn\'t get that. Try saying a number.', 'Try saying a number.');
  //     }
  // });
  // // These handlers are not bound to a state
  // var guessAttemptHandlers = {
  //     'TooHigh': function(val) {
  //         this.emit(':ask', val.toString() + ' is too high.', 'Try saying a smaller number.');
  //     },
  //     'TooLow': function(val) {
  //         this.emit(':ask', val.toString() + ' is too low.', 'Try saying a larger number.');
  //     },
  //     'JustRight': function(callback) {
  //         this.handler.state = states.STARTMODE;
  //         this.attributes['gamesPlayed']++;
  //         callback();
  //     },
  //     'NotANum': function() {
  //         this.emit(':ask', 'Sorry, I didn\'t get that. Try saying a number.', 'Try saying a number.');
  //     }
  // };
