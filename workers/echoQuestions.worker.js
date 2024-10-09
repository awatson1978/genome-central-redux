// import { get } from 'lodash';

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

//             console.log('nextQuestion', nextQuestion);

//             self.postMessage('Echoing questions ' + get(nextQuestion, 'linkId'));
//           }  
//         }
//       }
//     }
  
//     self.postMessage('Done processing questions');
//   };