# 手工提交步骤

```bash
unzip qingxier_V2.0_全栈源码与测试.zip
cd /path/to/your/qingxier-clone
git checkout agent/qingxier-v1-1-solution-tests
/path/to/qingxier_V2.0/submission/apply-to-repository.sh .
git add -A
git commit -m "完成 Node.js 全栈实现及测试"
git push origin agent/qingxier-v1-1-solution-tests
```

随后使用 `submission/PR_BODY.md` 更新 PR #1。
