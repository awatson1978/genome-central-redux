// self.onmessage = async (event) => {
//     const { questions, medicalHistory } = event.data;

//     const parsedQuestionnaireResponse = questions.split('\n');
  
//     console.log("------------------------------------------------------------------")
//     console.log('MEDICAL HISTORY');

//     console.log(textNormalForm);

//     if (Array.isArray(parsedQuestionnaireResponse)) {
//       for (const item of parsedQuestionnaireResponse) {
//         if (item) {
//           const nextQuestion = JSON.parse(item);                    
//           console.log('Next Question', nextQuestion);
        
//           if(nextQuestion){

//             if(get(nextQuestion, 'type') === "choice"){
                        
//               setTimeout(async function(){
          
//                 if(nextQuestion){      
                    
//                   console.log("------------------------------------------------------------------")
          
                  
//                   let nextQuestionText = get(nextQuestion, 'text', '');
//                   let nextQuestionAnswerOptions = get(nextQuestion, 'answerOptions', []);

//                   // need to add multiple choice answer possibilities
//                   nextQuestionAnswerOptions.forEach(function(answerOption){
//                     nextQuestionText + "\n" + JSON.stringify(answerOption);
//                   })
    
//                   let questionToAskTheOracle = "";          
//                   if (typeof nextQuestionText === "string"){
//                     questionToAskTheOracle = nextQuestionText + "\n\n" + textNormalForm;
//                   }
  
//                   let questionAnswer = await askMultipleChoiceQuestionChain.invoke({
//                     jsonInput: questionToAskTheOracle
//                   })
  
//                   console.log("------------------------------------------------------------------")
//                   console.log('QUESTION');
//                   console.log(questionToAskTheOracle);
//                   console.log("------------------------------------------------------------------")
//                   console.log('ANSWER');
//                   console.log(questionAnswer);
//                   console.log("------------------------------------------------------------------")
          
  
//                   if(!newAnswersString){
//                     newAnswersString = "";
//                   }
  
//                   newAnswersString = newAnswersString + nextQuestionText + "\n" + questionAnswer + "\n\n";
//                   setAnswers(newAnswersString)
  
   
//                   let newItem = nextQuestion;
//                   let answerItemArray = questionItemArray;
  
//                   if(!get(newItem, 'answer')){
//                     set(newItem, 'answer', []);
//                   }
//                   newItem.answer.push({
//                     valueString: questionAnswer
//                   })
  
//                   answerItemArray[index] = newItem;
  
//                   let serializedAnswerString = "";
//                   answerItemArray.forEach(function(question){
//                     if(question){
//                       serializedAnswerString = serializedAnswerString + JSON.stringify(question) + "\n";
//                     }
//                   })
//                   setSerializedAnswers(serializedAnswerString);
  
//                   let newQuestionnaireResponse;
  
//                   if(questionResponse){
//                     newQuestionnaireResponse = JSON.parse(questionResponse);
//                     newQuestionnaireResponse.item = answerItemArray
//                     console.log('newQuestionnaireResponse', newQuestionnaireResponse)
//                     setQuestionnaireResponse(JSON.stringify(newQuestionnaireResponse, null, 2));        
//                   } else {
//                     console.log('No questionnaireResponse')
//                   }
//                 }
//               }, 5000);

//             } else if(get(nextQuestion, 'type') !== "display"){
                        
                        
//               let nextQuestionText = get(nextQuestion, 'text', '');
//               console.log(nextQuestionText)
          
//               setTimeout(async function(){
          
//                 if(nextQuestion){      
                    
//                   console.log("------------------------------------------------------------------")
          
                  
//                   let questionToAskTheOracle = "";        
  
//                   if (typeof nextQuestionText === "string"){
//                     questionToAskTheOracle = nextQuestionText + "\n\n" + textNormalForm;
//                   }
  


//                   let questionAnswer = "";
                  
//                   if(get(nextQuestion, 'type') === "choice"){
//                     questionAnswer = await askMultipleChoiceQuestionChain.invoke({
//                       jsonInput: questionToAskTheOracle,
//                     })
//                   } else {
//                     questionAnswer = await askQuestionChain.invoke({
//                       jsonInput: questionToAskTheOracle,
//                     })
//                   }
  
//                   console.log("------------------------------------------------------------------")
//                   console.log('QUESTION');
//                   console.log(nextQuestionText);
//                   console.log("------------------------------------------------------------------")
//                   console.log('ANSWER');
//                   console.log(questionAnswer);
//                   console.log("------------------------------------------------------------------")
          
  
//                   if(!newAnswersString){
//                     newAnswersString = "";
//                   }
  
//                   newAnswersString = newAnswersString + nextQuestionText + "\n" + questionAnswer + "\n\n";
//                   setAnswers(newAnswersString)
  
   
//                   let newItem = nextQuestion;
//                   let answerItemArray = questionItemArray;
  
//                   if(!get(newItem, 'answer')){
//                     set(newItem, 'answer', []);
//                   }
//                   newItem.answer.push({
//                     valueString: questionAnswer
//                   })
  
//                   answerItemArray[index] = newItem;
  
//                   let serializedAnswerString = "";
//                   answerItemArray.forEach(function(question){
//                     if(question){
//                       serializedAnswerString = serializedAnswerString + JSON.stringify(question) + "\n";
//                     }
//                   })
//                   setSerializedAnswers(serializedAnswerString);
  
//                   let newQuestionnaireResponse;
  
//                   if(questionResponse){
//                     newQuestionnaireResponse = JSON.parse(questionResponse);
//                     newQuestionnaireResponse.item = answerItemArray
//                     console.log('newQuestionnaireResponse', newQuestionnaireResponse)
//                     setQuestionnaireResponse(JSON.stringify(newQuestionnaireResponse, null, 2));        
//                   } else {
//                     console.log('No questionnaireResponse')
//                   }
//                 }
//               }, 5000);
//             }
//           }  
//         }
//       }
//     }
  
//     self.postMessage('Done processing questions');
//   };