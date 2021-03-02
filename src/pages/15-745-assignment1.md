---
title: 15-745 spring 2019 assigment1
date: 2019-10-16 12:16:00
tags: ["compiler", "llvm", "15-745"]
---

## 1 Introduction

讲作业应该怎么交的，跳过

## 2 LLVM project

## 2.1 Obtaining the System Image

安装virtualbox 5.2以及对应版本的增强功能。

从http://www.cs.cmu.edu/~15745/vm-images/15745-S19Lubuntu.ova下载作业需要的image并把相关代码放在共享文件夹里。注意如果要使用共享文件夹、共享粘贴板之类的功能需要安装virtualbox的增强功能。

## 2.2 Create a Pass

把`loop.c`复制到`FunctionInfo/loop.c`，并将其编译为LLVM bytecode object (`loop.bc`)

```bash
clang -O -emit-llvm -c loop.c 
llvm-dis loop.bc  # Generate disassembly of LLVM bytecode
```

The original code `loop.c` is:

```c
int g;
int g_incr (int c)
{
  g += c;
  return g;
}
int loop (int a, int b, int c)
{
  int i;
  int ret = 0;
  for (i = a; i < b; i++) {
   g_incr (c);
  }
  return ret + g;
}
```

编译好的`loop.ll`文件如下：

```assembly
; ModuleID = 'loop.bc'
source_filename = "loop.c"
target datalayout = "e-m:e-p:32:32-f64:32:64-f80:32-n8:16:32-S128"
target triple = "i686-pc-linux-gnu"

@g = common local_unnamed_addr global i32 0, align 4

; Function Attrs: norecurse nounwind
define i32 @g_incr(i32 %c) local_unnamed_addr #0 {
entry:
  %0 = load i32, i32* @g, align 4, !tbaa !3
  %add = add nsw i32 %0, %c
  store i32 %add, i32* @g, align 4, !tbaa !3
  ret i32 %add
}

; Function Attrs: norecurse nounwind
define i32 @loop(i32 %a, i32 %b, i32 %c) local_unnamed_addr #0 {
entry:
  %cmp4 = icmp sgt i32 %b, %a
  %0 = load i32, i32* @g, align 4, !tbaa !3
  br i1 %cmp4, label %for.body.lr.ph, label %for.end

for.body.lr.ph:                                   ; preds = %entry
  %1 = sub i32 %b, %a
  %2 = mul i32 %1, %c
  %3 = add i32 %0, %2
  store i32 %3, i32* @g, align 4, !tbaa !3
  br label %for.end

for.end:                                          ; preds = %for.body.lr.ph, %entry
  %.lcssa = phi i32 [ %3, %for.body.lr.ph ], [ %0, %entry ]
  ret i32 %.lcssa
}

attributes #0 = { norecurse nounwind "correctly-rounded-divide-sqrt-fp-math"="false" "disable-tail-calls"="false" "less-precise-fpmad"="false" "no-frame-pointer-elim"="false" "no-infs-fp-math"="false" "no-jump-tables"="false" "no-nans-fp-math"="false" "no-signed-zeros-fp-math"="false" "no-trapping-math"="false" "stack-protector-buffer-size"="8" "target-cpu"="pentium4" "target-features"="+fxsr,+mmx,+sse,+sse2,+x87" "unsafe-fp-math"="false" "use-soft-float"="false" }

!llvm.module.flags = !{!0, !1}
!llvm.ident = !{!2}

!0 = !{i32 1, !"NumRegisterParameters", i32 0}
!1 = !{i32 1, !"wchar_size", i32 4}
!2 = !{!"clang version 5.0.1 (tags/RELEASE_501/final)"}
!3 = !{!4, !4, i64 0}
!4 = !{!"int", !5, i64 0}
!5 = !{!"omnipotent char", !6, i64 0}
!6 = !{!"Simple C/C++ TBAA"}
```

然后运行`FunctionInfo` pass,

```bash
$ make  # to create FunctionInfo.so
$ opt -load ./FunctionInfo.so -function-info loop.bc -o out
15745 Function Information Pass
```

注意这里的`-function-info`是通过`FunctionInfo.cpp`中的这一行注册的：

```cpp
static RegisterPass<FunctionInfo> X("function-info", "15745: Function Information", false, false);
```

## 2.3 Analysis Passes

### 2.3.1 Function Information

下面我们需要修改`FunctionInfo.cpp`了，在此之前，需要先学一下llvm中怎么写一个pass。因为作业使用的是llvm 5.0，所以可以看[这里](https://releases.llvm.org/5.0.1/docs/WritingAnLLVMPass.html)。了解了`FunctionPass`的简单内容，就可以来写代码了。这部分就是要输出函数的基本信息，还是很简单的。代码如下：

```cpp
// 15-745 S18 Assignment 1: FunctionInfo.cpp
// Group:
////////////////////////////////////////////////////////////////////////////////

#include "llvm/Pass.h"  // for writing a pass
#include "llvm/IR/Function.h"  // we are operating on Function
#include "llvm/IR/InstVisitor.h"
#include "llvm/Support/raw_ostream.h"  // for some printing

#include <iostream>

using namespace llvm;

namespace {  // use a anonymous namespace to make variables only visible here
  class FunctionInfo : public FunctionPass {  // for now, know that FunctionPass operates on a function at a time
  public:
    static char ID;  // declare pass identifier used by LLVM to identify pass
    FunctionInfo() : FunctionPass(ID) { }
    ~FunctionInfo() { }

    // We don't modify the program, so we preserve all analyses
    void getAnalysisUsage(AnalysisUsage &AU) const override {
      AU.setPreservesAll();
    }

    // Do some initialization
    bool doInitialization(Module &M) override {
      // errs() << "15745 Function Information Pass\n"; // TODO: remove this.
      outs() << "Name,\tArgs,\tCalls,\tBlocks,\tInsns\n";

      return false;
    }

    // Print output for each function
    bool runOnFunction(Function &F) override {
      std::string name = F.getName();
      std::string args = F.isVarArg() ? "*" : std::to_string(F.arg_size());
      uint64_t calls = F.getEntryCount().hasValue() ? F.getEntryCount().getValue() : 0;
      size_t blocks = F.getBasicBlockList().size();
      size_t instructions = 0;
      for (BasicBlock &BB : F) {
        instructions += BB.getInstList().size();
      }

      outs() << name << ",\t" << args << ",\t" << calls << ",\t" << blocks << ",\t" << instructions << "\n";

      return false;
    }
  };
}

// LLVM uses the address of this static member to identify the pass, so the
// initialization value is unimportant.
char FunctionInfo::ID = 0;
// the 4 arguments means:
// 1: command line argument
// 2: name
// 3: if a pass walks CFG without modifying it then the third argument is set to true;
// 4: if a pass is an analysis pass, for example dominator tree pass, then true is supplied as the fourth argument.
static RegisterPass<FunctionInfo> X("function-info", "15745: Function Information", false, false);
```

之后输出如下：

```bash
$ make
$ opt -load ./FunctionInfo.so -function-info loop.bc -o out
Name,	Args,	Calls,	Blocks,	Insns
g_incr,	1,	0,	1,	4
loop,	3,	0,	3,	10
```

### 2.3.2 Local Optimization

写过简单的pass之后，我们来进行优化。

首先需要看龙书的8.5.4 The Use of Algebraic Identities。这里主要提了3种代码优化方式：

- algebraic identity: 就是$+0$， $-0$， $*1$， $/1$这样可以省略的优化。
- strength reduction: 把贵的运算转变为便宜的，比如把$x^2$变为$x*x$，$2\times x$变为$x+x$, $x/2$变为$x\times0.5$
- constant folding: 把常数预先计算出来。

实现如下：

```cpp
// 15-745 S18 Assignment 1: LocalOpts.cpp
// Group:
////////////////////////////////////////////////////////////////////////////////

#include "llvm/Pass.h"  // for writing a pass
#include "llvm/IR/Function.h"  // we are operating on Function
#include "llvm/IR/InstVisitor.h"
#include "llvm/IR/Constants.h"
#include "llvm/IR/Instructions.h"
#include "llvm/IR/InstrTypes.h"
#include "llvm/Support/raw_ostream.h"  // for some printing
#include "llvm/Transforms/Utils/BasicBlockUtils.h"
#include <iostream>

using namespace llvm;

namespace {  // use a anonymous namespace to make variables only visible here
  class LocalOpts : public FunctionPass {  // for now, know that FunctionPass operates on a function at a time
  public:
    static char ID;  // declare pass identifier used by LLVM to identify pass
    LocalOpts() : FunctionPass(ID) { }
    ~LocalOpts() { }

    // We don't modify the program, so we preserve all analyses
    void getAnalysisUsage(AnalysisUsage &AU) const override {
      AU.setPreservesAll();
    }

    // Do some initialization
    bool doInitialization(Module &M) override {
      errs() << "15745 Local Optimization Pass\n"; // TODO: remove this.

      return false;
    }

    // Print output for each function
    bool runOnFunction(Function &F) override {
      errs() << "Function " << F.getName() << "\n";
      int numAlgIdentity = 0;
      int numConstFold = 0;
      int numStrengthRed = 0;
      outs() << "before: " << F << "\n";
      for (BasicBlock &BB : F) {
        for (BasicBlock::iterator iter = BB.begin(); iter != BB.end(); ++iter) {
          if (BinaryOperator* binaryI = dyn_cast<BinaryOperator>(&(*iter))) {
            Value* left = binaryI->getOperand(0);
            Value* right = binaryI->getOperand(1);
            ConstantInt* constIntA = dyn_cast<ConstantInt>(left);
            ConstantInt* constIntB = dyn_cast<ConstantInt>(right);
            if (constIntA && constIntB) {  // constant fold
              const APInt& constIntValA = constIntA->getValue();
              const APInt& constIntValB = constIntB->getValue();

              ConstantInt* evalConst = nullptr;
              switch (binaryI->getOpcode()) {
                case Instruction::Add:
                  evalConst = ConstantInt::get(constIntA->getContext(), constIntValA + constIntValB);
                  break;
                case Instruction::Sub:
                  evalConst = ConstantInt::get(constIntA->getContext(), constIntValA - constIntValB);
                  break;
                case Instruction::Mul:
                  evalConst = ConstantInt::get(constIntA->getContext(), constIntValA * constIntValB);
                  break;
                case Instruction::SDiv:
                  evalConst = ConstantInt::get(constIntA->getContext(), constIntValA.sdiv(constIntValB));
                  break;
                case Instruction::UDiv:
                  evalConst = ConstantInt::get(constIntA->getContext(), constIntValA.udiv(constIntValB));
                  break;
                default:
                  break;
              }
              if (evalConst) {
                outs() << "Constant Fold: " << binaryI->getName() << " " \
                       << constIntValA.toString(10, true) << " " << constIntValB.toString(10, true) << "\n";
                ReplaceInstWithValue(BB.getInstList(), iter, evalConst);
                --iter; // this is crucial!!!
                numConstFold++;
              }
            } else {  // algebraic identity
              ConstantInt* constTerm = nullptr;
              Value* otherTerm = nullptr;
              Value* eval = nullptr;
              if (constIntA) {
                constTerm = constIntA;
                otherTerm = right;
              } else if (constIntB) {
                constTerm = constIntB;
                otherTerm = left;
              }
              if (constTerm) {
                switch (binaryI->getOpcode()) {
                  case Instruction::Add:
                    if (constTerm->isZero())
                      eval = otherTerm;
                    break;
                  case Instruction::Sub:
                    if (constIntA && constIntA->isZero())
                      eval = constIntB;
                    break;
                  case Instruction::Mul:
                    if (constTerm->isOne())
                      eval = otherTerm;
                    else if (constTerm->isZero())
                      eval = ConstantInt::get(constTerm->getType(), 0, true);
                    else if (constTerm->getValue().isPowerOf2()) {  // strength reduction
                      const int64_t constIntVal = constTerm->getSExtValue();
                      Value* shiftVal = ConstantInt::get(constTerm->getType(), log2(constIntVal));
                      ReplaceInstWithInst(BB.getInstList(), iter, BinaryOperator::Create(Instruction::Shl, otherTerm, shiftVal));
                      iter--;
                      numStrengthRed++;
                    }
                    break;
                  case Instruction::SDiv:
                    if (constIntB && constIntB->isOne())
                      eval = constIntA;
                    else if (constIntA && constIntA->isZero())
                      eval = ConstantInt::get(constTerm->getType(), 0, true);
                    else if (constTerm->getValue().isPowerOf2()) {  // strength reduction
                      const int64_t constIntVal = constTerm->getSExtValue();
                      Value* shiftVal = ConstantInt::get(constTerm->getType(), log2(constIntVal));
                      ReplaceInstWithInst(BB.getInstList(), iter, BinaryOperator::Create(Instruction::AShr, otherTerm, shiftVal));
                      iter--;
                      numStrengthRed++;
                    }
                    break;
                  case Instruction::UDiv:
                    if (constIntB && constIntB->isOne())
                      eval = constIntA;
                    else if (constIntA && constIntA->isZero())
                      eval = ConstantInt::get(constTerm->getType(), 0, true);
                    else if (constTerm->getValue().isPowerOf2()) {  // strength reduction
                      const int64_t constIntVal = constTerm->getSExtValue();
                      Value* shiftVal = ConstantInt::get(constTerm->getType(), log2(constIntVal));
                      ReplaceInstWithInst(BB.getInstList(), iter, BinaryOperator::Create(Instruction::LShr, otherTerm, shiftVal));
                      iter--;
                      numStrengthRed++;
                    }
                    break;
                  default:
                    break;
                }
              } else {
                switch (binaryI->getOpcode()) {
                  case Instruction::Sub:
                    if (left == right)
                      eval = ConstantInt::get(left->getType(), 0, true);
                    break;
                  case Instruction::SDiv:
                  case Instruction::UDiv:
                    if (left == right)
                      eval = ConstantInt::get(left->getType(), 1, true);
                    break;
                  default:
                    break;
                }
              }
              if (eval) {
                  outs() << "Algebraic Identity: " << binaryI->getName() << " " \
                        << "\n";
                  ReplaceInstWithValue(BB.getInstList(), iter, eval);
                  --iter; // this is crucial!!!
                  numAlgIdentity++;
                }
            }
          }
        }
      }
      outs() << "after: " << F << "\n";
      outs() << "\n";

      outs() << "Transformations applied:\n";
      outs() << "  Algebraic identities: " << numAlgIdentity << "\n";
      outs() << "  Constant folding: " << numConstFold << "\n";
      outs() << "  Stength reduction: " << numStrengthRed << "\n";
      return false;
    }
  };
}

// LLVM uses the address of this static member to identify the pass, so the
// initialization value is unimportant.
char LocalOpts::ID = 0;
// the 4 arguments means:
// 1: command line argument
// 2: name
// 3: if a pass walks CFG without modifying it then the third argument is set to true;
// 4: if a pass is an analysis pass, for example dominator tree pass, then true is supplied as the fourth argument.
static RegisterPass<LocalOpts> X("local-opts", "15745: Local Optimization", false, false);
```

## 3 Homework Questions

## 3.1 CFG Basics

```
--------B1--------
	x = 50
	y = 8
	z = 234
--------B2--------
L1: if (x < z) { goto L2 }
--------B3--------
	x = x + 1
	goto L1
--------B4--------
L2: y = 89
--------B5--------
	if (z > x) { goto L3 }
--------B6--------
	z = 65
	return z
--------B7--------
L3: y = x + 1
	if (z < x) { goto L4 }
--------B8--------
	x = 25
--------B9--------
L4: y = x + z
	switch (y) { 334: goto L5 | default: goto L6 }
--------B10-------
L5: print("failure")
L6: y = 65
	return y
```

## 3.2 Available Expressions

![figure2](https://i.imgur.com/mPg6Nqb.png)

| BB   | GEN      | KILL     | IN                                  | OUT                                      |
| ---- | -------- | -------- | ----------------------------------- | ---------------------------------------- |
| 1    | c+d, b*d |          |                                     | c+d, b*d                                 |
| 2    | e+b, c+a | c+d      | c+d, b*d                            | e+b, c+a, b*d                            |
| 3    | b+a, a+d | e+b, c+a | e+b, c+a, b*d                       | b+a, a+d, b*d                            |
| 4    | c*c, b+d |          | e+b, c+a, b*d                       | c\*c, b+d, e+b, c+a, b\*d                |
| 5    | i+2      |          | c\*c, b+d, e+b, c+a, b\*d, b+a, a+d | c\*c, b+d, e+b, c+a, b\*d, b+a, a+d, i+2 |

