---
title: 15-745 spring 2019 assigment2
date: 2019-10-23 20:02:00
tags: ["compiler", "llvm", "15-745"]
---

## 1 Introduction

讲作业应该怎么交的，跳过

## 2 Dataflow Analysis

就是需要写一个一般性的dataflow的分析代码。主要要用llvm中的`BitVector`和`DenseMap`，前者就是用来快速做集合位运算的，后者相当于`unordered_map`。需要注意的是，llvm 5.0把所有类似于`Function F = func`，`Instruction I = inst`这样的指令都去掉了，所以只能用`Function* F = &func`。

下面就是代码了，首先是framework。

```cpp
// dataflow.h
namespace llvm {

// Add definitions (and code, depending on your strategy) for your dataflow
// abstraction here.
  enum Direction {
    FORWARD = 0,
    BACKWARD
  };

  struct DataflowBlock {
    DataflowBlock(int n, BasicBlock* b) : in(BitVector(n)), out(BitVector(n)), block(b) { }
    BitVector in;
    BitVector out;
    BasicBlock* block;
  };

  class Dataflow {
  public:
    Dataflow(int n, Direction d) : n(n), direction(d) { };
    void run(Function& F);
  protected:
    virtual BitVector meet(std::vector<BitVector> vectors) = 0;
    virtual BitVector transfer(BitVector in, BasicBlock &B) = 0;
    virtual void printResult(Function& F) = 0;
    
    int n;
    Direction direction;
    DenseMap<BasicBlock*, DataflowBlock*> BB2dataflowB;
  };
}

// dataflow.c
namespace llvm {

  // Add code for your dataflow abstraction here.
  void Dataflow::run(Function& F) {
    // 因为不知道该怎么初始化Function（所有的构造函数都被删除了...）
    // 所以只能在run的时候再初始化了...
    for (BasicBlock &BB : F) {
      DataflowBlock *dataflowB = new DataflowBlock(n, &BB);
      BB2dataflowB.try_emplace(&BB, dataflowB);
    }

    bool converged = false;
    if (direction == FORWARD) {  // forward
      while(!converged) {
        for (BasicBlock &BB : F) {
          DataflowBlock* dataflowB = BB2dataflowB.find(&BB)->second;
          dataflowB->out = transfer(dataflowB->in, BB);
        }
        converged = true;
        for (BasicBlock &BB : F) {
          std::vector<BitVector> vectors;
          for (BasicBlock *pred : predecessors(&BB)) {
            DataflowBlock* predDataflowB = BB2dataflowB.find(pred)->second;
            vectors.push_back(predDataflowB->out);
          }
          
          if (vectors.size()) {
            DataflowBlock* dataflowB = BB2dataflowB.find(&BB)->second;
            BitVector in = meet(vectors);
            if (dataflowB->in != in) {
              converged = false;
              dataflowB->in = in;
            }
          }
        }
      }
    } else {  // backward
      while(!converged) {
        for (BasicBlock &BB : F) {
          DataflowBlock* dataflowB = BB2dataflowB.find(&BB)->second;
          dataflowB->in = transfer(dataflowB->out, BB);
        }
        converged = true;
        for (BasicBlock &BB : F) {
          std::vector<BitVector> vectors;
          for (BasicBlock *succ : successors(&BB)) {
            DataflowBlock* succDataflowB = BB2dataflowB.find(succ)->second;
            vectors.push_back(succDataflowB->in);
          }
          
          if (vectors.size()) {
            DataflowBlock* dataflowB = BB2dataflowB.find(&BB)->second;
            BitVector out = meet(vectors);
            if (dataflowB->out != out) {
              converged = false;
              dataflowB->out = out;
            }
          }
        }
      }
    }
    // print result
    printResult(F);
  }
}
```

然后是available expression：

```cpp
//available.cpp
namespace {
  class AvailableDataflow : public Dataflow {
  public:
    AvailableDataflow(std::vector<Expression> &domain) : Dataflow(domain.size(), FORWARD), domain(domain) {
      for (int i=0; i<n; i++) {
        Expression expr = domain[i];
        if (isa<Instruction>(expr.v1)) {
          if (val2is.find(expr.v1) == val2is.end()) {
            val2is.try_emplace(expr.v1, std::vector<int>());
          }
          val2is[expr.v1].push_back(i);
        }
        if (isa<Instruction>(expr.v2)) {
          if (val2is.find(expr.v2) == val2is.end()) {
            val2is.try_emplace(expr.v2, std::vector<int>());
          }
          val2is[expr.v2].push_back(i);
        }
      }
    }
  protected:
    BitVector meet(std::vector<BitVector> vectors) override {
      BitVector result(n, true);
      for (auto vector : vectors) {
        result &= vector;
      }
      return result;
    }

    BitVector transfer(BitVector in, BasicBlock &B) override {
      for (Instruction &I : B) {
        if (BinaryOperator *BI = dyn_cast<BinaryOperator>(&I)) {
          Expression expr(BI);
          int i=0;
          for(i = 0; i<n; i++) {
            if (expr == domain[i])
              break;
          }

          in[i] = true;
          for (int i : val2is[(Value*)&BI]) {
            in[i] = false;
          }
        }
      }
      return in;
    }

    std::vector<Expression> domain;
    DenseMap<Value*, std::vector<int>> val2is;

    void printResult(Function& F) override {
      errs() << "*********************available result**************************\n";
      for (BasicBlock &BB : F) {
        errs() << "block: \n";
        errs() << BB << "\n";
        DataflowBlock* dataflowB = BB2dataflowB.find(&BB)->second;

        errs() << "in: " << "\n";
        for (int i=0; i<n; i++) {
          if (dataflowB->in[i]) {
            errs() << "  " << domain[i].toString() << "\n";
          }
        }
        errs() << "out: " << "\n";
        for (int i=0; i<n; i++) {
          if (dataflowB->out[i]) {
            errs() << "  " << domain[i].toString() << "\n";
          }
        }
      }
    }
  };


  class AvailableExpressions : public FunctionPass {
    
  public:
    static char ID;
    
    AvailableExpressions() : FunctionPass(ID) { }
    
    virtual bool runOnFunction(Function& F) {
      
      // Here's some code to familarize you with the Expression
      // class and pretty printing code we've provided:
      
      std::vector<Expression> expressions;
      for (Function::iterator FI = F.begin(), FE = F.end(); FI != FE; ++FI) {
        BasicBlock* block = &*FI;
        for (BasicBlock::iterator i = block->begin(), e = block->end(); i!=e; ++i) {
          Instruction* I = &*i;
          // We only care about available expressions for BinaryOperators
          if (BinaryOperator *BI = dyn_cast<BinaryOperator>(I)) {
            // Create a new Expression to capture the RHS of the BinaryOperator
            expressions.push_back(Expression(BI));
          }
        }
      }
      
      // Print out the expressions used in the function
      outs() << "Expressions used by this function:\n";
      printSet(&expressions);
      
      // delete the replicated expressions
      sort(expressions.begin(), expressions.end());
      expressions.erase(unique(expressions.begin(), expressions.end()), expressions.end());

      AvailableDataflow dataflow(expressions);
      dataflow.run(F);

      // Did not modify the incoming Function.
      return false;
    }
    
    virtual void getAnalysisUsage(AnalysisUsage& AU) const {
      AU.setPreservesAll();
    }
    
  private:
  };
  
  char AvailableExpressions::ID = 0;
  RegisterPass<AvailableExpressions> X("available", "15745 Available Expressions");
}
```

对于liveness，代码是这样的：

```cpp
namespace {
    class LivenessDataflow : public Dataflow {
  public:
    LivenessDataflow(std::vector<Value*> &domain) : Dataflow(domain.size(), BACKWARD), domain(domain) {
      for (int i=0; i<n; i++) {
        val2i.try_emplace(domain[i], i);
      }
    }
  protected:
    BitVector meet(std::vector<BitVector> vectors) override {
      BitVector result(n);
      for (auto vector : vectors) {
        result |= vector;
      }
      return result;
    }

    BitVector transfer(BitVector out, BasicBlock &B) override {
      for (BasicBlock::reverse_iterator iter = B.rbegin(); iter != B.rend(); iter++) { 
        Instruction* I = &(*iter);
        out[val2i[I]] = false;
        for (User::op_iterator OI = I->op_begin(); OI != I->op_end(); ++OI) {
          Value *val = *OI;
          if(isa<Instruction>(val) || isa<Argument>(val)) {
            out[val2i[val]] = true;
          }
        }
      }
      return out;
    }

    void printResult(Function& F) override {
      errs() << "*********************available result**************************\n";
      for (BasicBlock &BB : F) {
        errs() << "block: \n";
        errs() << BB << "\n";
        DataflowBlock* dataflowB = BB2dataflowB.find(&BB)->second;

        errs() << "in: " << "\n";
        for (int i=0; i<n; i++) {
          if (dataflowB->in[i]) {
            errs() << "  " << getShortValueName(domain[i]) << "\n";
          }
        }
        errs() << "out: " << "\n";
        for (int i=0; i<n; i++) {
          if (dataflowB->out[i]) {
            errs() << "  " << getShortValueName(domain[i]) << "\n";
          }
        }
      }
    }

    std::vector<Value*> domain;
    DenseMap<Value*, int> val2i;
  };

  class Liveness : public FunctionPass {
  public:
    static char ID;

    Liveness() : FunctionPass(ID) { }

    virtual bool runOnFunction(Function& F) {
      std::vector<Value*> domain;
      // all the arguments are variables
      for (Function::arg_iterator arg = F.arg_begin(); arg != F.arg_end(); ++arg) {
        domain.push_back(arg);
      }
      for (BasicBlock &BB : F) {
        for (Instruction &I : BB) {
          domain.push_back(&I);
        }
      }
      LivenessDataflow dataflow(domain);
      dataflow.run(F);
      // Did not modify the incoming Function.
      return false;
    }

    virtual void getAnalysisUsage(AnalysisUsage& AU) const {
      AU.setPreservesAll();
    }

  private:
  };

  char Liveness::ID = 0;
  RegisterPass<Liveness> X("liveness", "15745 Liveness");
}
```



