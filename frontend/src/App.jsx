import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  AppBar, Toolbar, Typography, Container, Box, Button, Checkbox, FormControlLabel,
  Paper, Stack, Drawer, IconButton, LinearProgress, Chip, Fade, useMediaQuery,
  ThemeProvider, createTheme, TextField
} from '@mui/material'
import { Visibility, CheckCircle, Cancel, ArrowBack, ArrowForward,
  Insights, Info } from '@mui/icons-material'
import katex from 'katex'
import { remark } from 'remark'
import remarkParse from 'remark-parse'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeStringify from 'rehype-stringify'

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#6c5ce7' }, secondary: { main: '#00cec9' } },
  typography: { fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }
})

const API_BASE = ''

const mathProcessor = remark()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeKatex, { throwOnError: false, strict: false })
  .use(rehypeStringify, { allowDangerousHtml: true })

function Md({ children }) {
  const html = useMemo(() => {
    const md = (typeof children === 'string' ? children : String(children))
    try {
      return mathProcessor.processSync(md).toString()
    } catch {
      return md
        .replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => katex.renderToString(m.trim(), { displayMode: true, throwOnError: false }))
        .replace(/\$([^\n]+?)\$/g, (_, m) => katex.renderToString(m.trim(), { displayMode: false, throwOnError: false }))
    }
  }, [children])
  return <div className="md-root" dangerouslySetInnerHTML={{ __html: html }} />
}

function shuffleArrayWithOriginal(arr, correctOriginalIdx) {
  const indexed = arr.map((item, idx) => ({ item, idx }))
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indexed[i], indexed[j]] = [indexed[j], indexed[i]]
  }
  const newCorrectIdx = indexed.findIndex(x => x.idx === correctOriginalIdx)
  return {
    shuffled: indexed.map(x => x.item),
    originalIndices: indexed.map(x => x.idx),
    newCorrectIdx
  }
}

function App() {
  const [question, setQuestion] = useState(null)
  const [options, setOptions] = useState([])
  const [total, setTotal] = useState(0)
  const [currentId, setCurrentId] = useState(1)
  const [selectedOption, setSelectedOption] = useState(null)
  const [answerData, setAnswerData] = useState(null)
  const [versionMatch, setVersionMatch] = useState(true)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [isRandomMode, setIsRandomMode] = useState(false)
  const [isStatEnabled, setIsStatEnabled] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [backendVersion, setBackendVersion] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({ answered: 0, correct: 0 })
  const [shuffleMeta, setShuffleMeta] = useState({ shuffled: [], originalIndices: [], newCorrectIdx: -1 })
  const [jumpInput, setJumpInput] = useState('')
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const frontendVersion = useMemo(() => '1.0.0', [])

  const loadState = useCallback(() => {
    try {
      const r = localStorage.getItem('gkenntei_random')
      if (r !== null) setIsRandomMode(r === 'true')
      const s = localStorage.getItem('gkenntei_stats')
      if (s !== null) setIsStatEnabled(s === 'true')
      const a = localStorage.getItem('gkenntei_answered')
      const c = localStorage.getItem('gkenntei_correct')
      setStats({ answered: a ? parseInt(a, 10) : 0, correct: c ? parseInt(c, 10) : 0 })
      const savedRandom = localStorage.getItem('gkenntei_random')
      if (savedRandom === 'true') {
        const savedTotal = parseInt(localStorage.getItem('gkenntei_total') || '1', 10)
        const newId = Math.floor(Math.random() * savedTotal) + 1
        setCurrentId(newId)
      } else {
        const savedId = localStorage.getItem('gkenntei_current_id')
        if (savedId) setCurrentId(parseInt(savedId, 10))
      }
    } catch {}
  }, [])

  useEffect(() => { loadState() }, [loadState])

  useEffect(() => {
    fetch(`${API_BASE}/v`).then(r => r.json()).then(d => {
      setBackendVersion(d.version)
      const frontParts = frontendVersion.split('.')
      const backParts = (d.version || '').split('.')
      if (frontParts.length >= 2 && backParts.length >= 2) {
        setVersionMatch(frontParts[0] === backParts[0] && frontParts[1] === backParts[1])
      }
    }).catch(() => {})
  }, [frontendVersion])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    fetch(`${API_BASE}/q?id=${currentId}`).then(async r => {
      const data = await r.json()
      if (cancelled) return
      setQuestion(data.question)
      setOptions(data.options || [])
      setTotal(data.total || 0)
      setAnswerData(null)
      setHasAnswered(false)
      setSelectedOption(null)
      if (data.total) localStorage.setItem('gkenntei_total', data.total.toString())
      localStorage.setItem('gkenntei_current_id', currentId.toString())
      if (cancelled) return
      const rawOpts = data.options || []
      if (rawOpts.length) {
        const { shuffled, originalIndices, newCorrectIdx } = shuffleArrayWithOriginal(rawOpts, 0)
        setOptions(shuffled)
        setShuffleMeta({ shuffled, originalIndices, newCorrectIdx })
      }
      if (!cancelled) setIsLoading(false)
    }).catch(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [currentId])

  const handleRandomNext = useCallback(() => {
    const savedTotal = parseInt(localStorage.getItem('gkenntei_total') || '1', 10)
    const newId = Math.floor(Math.random() * savedTotal) + 1
    setCurrentId(newId)
    localStorage.setItem('gkenntei_current_id', newId.toString())
  }, [])

  const handleNext = useCallback(() => {
    if (total === 0) return
    const next = currentId >= total ? 1 : currentId + 1
    setCurrentId(next)
    localStorage.setItem('gkenntei_current_id', next.toString())
  }, [currentId, total])

  const handlePrev = useCallback(() => {
    if (total === 0) return
    const prev = currentId <= 1 ? total : currentId - 1
    setCurrentId(prev)
    localStorage.setItem('gkenntei_current_id', prev.toString())
  }, [currentId, total])

  const handleJump = useCallback(() => {
    const num = parseInt(jumpInput, 10)
    if (!isNaN(num) && num >= 1 && num <= total) {
      setCurrentId(num)
      localStorage.setItem('gkenntei_current_id', num.toString())
      setJumpInput('')
    }
  }, [jumpInput, total])

  const revealAnswer = useCallback((userSelectedIdx = null) => {
    if (hasAnswered) return
    fetch(`${API_BASE}/a`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentId })
    }).then(r => r.json()).then(data => {
      setAnswerData(data)
      setHasAnswered(true)
      if (userSelectedIdx !== null && data.correct_id !== undefined) {
        const userOriginalIdx = shuffleMeta.originalIndices[userSelectedIdx]
        const isCorrect = userOriginalIdx === data.correct_id
        setStats(prev => {
          const answered = prev.answered + 1
          const correct = prev.correct + (isCorrect ? 1 : 0)
          localStorage.setItem('gkenntei_answered', answered.toString())
          localStorage.setItem('gkenntei_correct', correct.toString())
          return { answered, correct }
        })
      }
    })
  }, [currentId, hasAnswered, shuffleMeta.originalIndices])

  const handleOptionClick = (idx) => {
    if (hasAnswered) return
    setSelectedOption(idx)
    revealAnswer(idx)
  }

  const handleRandomToggle = (e) => {
    const val = e.target.checked
    setIsRandomMode(val)
    localStorage.setItem('gkenntei_random', val.toString())
    if (val) {
      handleRandomNext()
    }
  }

  const handleStatToggle = () => {
    setIsStatEnabled(prev => {
      const next = !prev
      localStorage.setItem('gkenntei_stats', next.toString())
      if (next) {
        setStats({ answered: 0, correct: 0 })
        localStorage.setItem('gkenntei_answered', '0')
        localStorage.setItem('gkenntei_correct', '0')
      }
      return next
    })
  }

  const correctRate = stats.answered > 0 ? ((stats.correct / stats.answered) * 100).toFixed(1) : '0.0'
  const curCorrectOriginalId = answerData?.correct_id
  const curCorrectShuffledIdx = curCorrectOriginalId !== undefined
    ? shuffleMeta.originalIndices.findIndex(oi => oi === curCorrectOriginalId)
    : -1

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa', pb: 4 }}>
        {!versionMatch && (
          <Paper sx={{ m: 2, p: 2, bgcolor: '#fff3cd', color: '#856404' }}>
            <Typography variant="body2">バージョン不一致: フロントエンド {frontendVersion} とバックエンド {backendVersion} が一致しません。バージョンを更新してください。</Typography>
          </Paper>
        )}
        <AppBar position="sticky" sx={{ bgcolor: 'primary.main' }}>
          <Toolbar sx={{ gap: 1, flexDirection: isMobile ? 'column' : 'row', py: 1, position: 'relative' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>G検定模擬テスト</Typography>

            {isStatEnabled && (
              <Fade in>
                <Stack direction={isMobile ? 'column' : 'row'} spacing={1} sx={{ width: isMobile ? '100%' : 'auto' }}>
                  <Chip label={`回答数: ${stats.answered}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
                  <Chip label={`正解数: ${stats.correct}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
                  <Chip label={`問題数: ${total}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
                  <Chip label={`正答率: ${correctRate}%`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
                </Stack>
              </Fade>
            )}

            {!isMobile && (
              <Typography variant="caption" sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.8)' }}>
                {currentId} / {total}
              </Typography>
            )}

            <Box sx={{ flexGrow: 1 }} />

            <FormControlLabel
              control={<Checkbox checked={isRandomMode} onChange={handleRandomToggle} sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }} />}
              label={<Typography sx={{ color: 'white', fontSize: '0.875rem' }}>ランダム</Typography>}
            />
            <IconButton onClick={handleStatToggle} sx={{ color: 'white' }} title="統計">
              <Insights />
            </IconButton>
            <IconButton onClick={() => setNoticeOpen(true)} sx={{ color: 'white' }} title="通知">
              <Info />
            </IconButton>
          </Toolbar>
          {isMobile && (
            <Box sx={{ px: 2, pb: 1 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                {currentId} / {total}
              </Typography>
            </Box>
          )}
        </AppBar>

        <Container maxWidth="md" sx={{ mt: 4 }}>
          {isLoading && <LinearProgress />}
          {!isLoading && question && (
            <Stack spacing={3}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 3, bgcolor: '#fff', borderLeft: '6px solid', borderColor: 'primary.main' }}>
                <Md>
                  {question}
                </Md>
              </Paper>

              <Stack spacing={1.5}>
                {options.map((opt, idx) => {
                  const label = String.fromCharCode(65 + idx)
                  let bg = '#fff'
                  if (hasAnswered) {
                    if (idx === curCorrectShuffledIdx) bg = '#e6f9e6'
                    else if (idx === selectedOption && idx !== curCorrectShuffledIdx) bg = '#ffe6e6'
                  }
                  return (
                    <Paper key={idx} elevation={hasAnswered ? 1 : 2} sx={{
                      p: 2, borderRadius: 2, cursor: hasAnswered ? 'default' : 'pointer',
                      bgcolor: bg, border: '1px solid #e0e0e0', transition: 'all 0.2s',
                      '&:hover': !hasAnswered ? { borderColor: 'primary.main', transform: 'translateY(-2px)' } : {},
                      display: 'flex', alignItems: 'center', gap: 1.5
                    }} onClick={() => handleOptionClick(idx)}>
                      <Box sx={{
                        width: 28, height: 28, minWidth: 28, borderRadius: '50%',
                        bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.85rem'
                      }}>
                        {label}
                      </Box>
                      {hasAnswered && idx === curCorrectShuffledIdx && <CheckCircle sx={{ color: 'success.main' }} />}
                      {hasAnswered && idx === selectedOption && idx !== curCorrectShuffledIdx && <Cancel sx={{ color: 'error.main' }} />}
                      <Box sx={{ flexGrow: 1 }}>
                        <Md>{opt}</Md>
                      </Box>
                    </Paper>
                  )
                })}
              </Stack>

              <Stack direction="row" spacing={1} justifyContent="center">
                <Button variant="outlined" startIcon={<ArrowBack />} onClick={handlePrev} disabled={isLoading || total === 0}>前の問題</Button>
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    type="number"
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleJump() }}
                    disabled={isLoading || total === 0}
                    sx={{ width: 80 }}
                    inputProps={{ min: 1, max: total }}
                    placeholder="番号"
                  />
                  <Button variant="contained" onClick={handleJump} disabled={isLoading || total === 0}>移動</Button>
                </Stack>
                {hasAnswered ? (
                  <Button variant="contained" startIcon={<Visibility />} onClick={() => {
                    setAnswerData(null)
                    setHasAnswered(false)
                    setSelectedOption(null)
                    if (isRandomMode) handleRandomNext()
                    else handleNext()
                  }} disabled={isLoading}>次の問題</Button>
                ) : (
                  <Button variant="contained" startIcon={<Visibility />} onClick={() => revealAnswer()} disabled={isLoading}>解答を見る</Button>
                )}
                {!hasAnswered && (
                  <Button variant="outlined" endIcon={<ArrowForward />} onClick={isRandomMode ? handleRandomNext : handleNext} disabled={isLoading || total === 0}>次の問題</Button>
                )}
              </Stack>

              {hasAnswered && answerData && (
                <Fade in>
                  <Paper elevation={2} sx={{ p: 3, borderRadius: 3, bgcolor: '#fff', border: '2px solid #00cec9' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'secondary.main' }}>解説</Typography>
                    <Md>
                      {answerData.answer}
                    </Md>
                  </Paper>
                </Fade>
              )}
            </Stack>
          )}
        </Container>

        <Drawer anchor="right" open={noticeOpen} onClose={() => setNoticeOpen(false)}>
          <Box sx={{ width: isMobile ? '100vw' : 400, p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">通知ボード</Typography>
              <IconButton onClick={() => setNoticeOpen(false)}><Info /></IconButton>
            </Stack>
            <Md>{`## 使い方

### ナビゲーション
- **前の問題** / **次の問題** ボタンで問題を移動します。
- 番号を入力して **移動** ボタン（または Enter）で直接ジャンプできます。

### モード
- **ランダム**: 問題をランダムな順序で出題します。問題数は引き続き追跡されます。
- **統計**: ヘッダーに回答数、正解数、問題数、正答率を表示します。再度クリックすると統計がリセットされます。

### 回答方法
- 選択肢をクリックすると回答を決定し、解説が表示されます。
- **解答を見る** ボタンで、選択なしに解説を表示できます。

### お知らせ
- このボードは使い方を説明しています。
- フロントエンドを再ビルドすると手動で更新されます。`}</Md>
          </Box>
        </Drawer>
      </Box>
    </ThemeProvider>
  )
}

export default App
