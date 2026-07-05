## system description

please write a question-answer system (backend + frontend), backend is python fastapi and frontend is in react. 

## bachend

- at init, the fastapi read from q_a_clean_qw.json file and store the data in memory.

- the fastapi should has a version like vx.y.z, config at __init__.py.

### API

- '/q' [GET]
    - parameters:
        - id (optional, default=1)=question_id
    - response [JSON]
        - question: "xxx"
        - options: ["xxx", "xxx", "xxx", "xxx"]
        - total: size of all questions
- '/a' [POST]
    - parameters:
        - id (required) = question_id
    - response [JSON]
        - answer: "xxx"
- '/v' [GET]
    - response [JSON]: the version info of current system


## frontend

- the frontend in react should get question/answer from backend api.

- the frontend should shuffle the options but remember the original index of the shuffled options.

- under the random mode, the frontend randomly generates the question id each time.

- each time frontend fetch a question, it should update the "total" field in the response and current question id, and save to the state of the frontend (at browser); after refresh, continue from the last question id (except random mode), if in random mode, the next question id generated randomly will use the saved total field.

- the frontend request questions (together with options) from backend api, then the user select one option or click the "see answer" button then the frontend request the answer (together with the explain), high light the correct options (in green), mark the selected option if not correct (in red) and show the explain.

- the frontend should has a statistic mode, show the currently answered question count / correct count / total / correct rate in the head. the statistic data should remember to the state of the frontend(at browser). 

- the statistic data will be clean by switch the statistic mode

- the state of "is statistic enabled" / "is random enabled" should be saved to the state of the frontend (at browser).

- an notice board btn should at the header, click to pop out the notice board, a notice board (default hidden), the content of notice board is writed in frontend staticly.

- the frontend should has a version info, config at package.json, at the react init on browser, it should get the version info from backend api and the version of frontend should match the version of backend on "y" and "x" (vx.y.z).

### frontend ui

- a question display area (markdown render)
- 4 options display area (markdown render)
- a explain display area (markdown render)
- a "see answer" button
- a "previous question" button
- a "next question" button
- a checkbox to enable random mode
- a btn to enable statistic mode
- a notice board btn
- a notice board (markdown render)

### frontend style

- the frontend should use react + material ui to build the ui.

- the whole ui should be fast and responsive.

- the ui should be simple and clear.

- the style of ui should be looks like fashion style.

- the ui should be mobile friendly.
