	ORG #100

	DI
	LD SP,#8000
	LD HL,#8000
L1	LD (HL),0
	INC L
	JP NZ,L1
	INC H
	JP NZ,L1
	XOR A,A
	OUT (#02),A

	LD B,#80
	LD A,#16
	OUT (#08),A
	LD A,#21
	OUT (#0B),A
L2	XOR A,A
	OUT (#08),A
	IN A,(#0B)
	PUSH AF
	DEC B
	JP NZ,L2

	LD DE,#C0F8
	LD B,#80
L3	POP AF
	INC D
	CALL PRA
	DEC B
	JP NZ,L3
	JP $

PRA	PUSH AF
	CALL PRD
	POP AF
	RLA
	RLA
	RLA
	RLA
PRD	AND A,#F0
	RRA
	PUSH BC
	PUSH DE
	PUSH HL
	LD HL,FONT
	ADD A,L
	LD L,A
	LD B,#8
X1	LD A,(HL)
	LD (DE),A
	INC DE
	INC HL
	DEC B
	JP NZ,X1
	POP HL
	POP DE
	POP BC
	INC D
	LD A,D
	CP #DE
	RET C
	LD D,#C0
	LD A,E
	SUB A,10
	LD E,A
	RET

FONT:	DB #00,#3C,#66,#66,#66,#66,#3C,#00
	DB #00,#3C,#18,#18,#18,#78,#38,#00
	DB #00,#7E,#30,#18,#0C,#6C,#38,#00
	DB #00,#3C,#66,#06,#1C,#06,#7E,#00
	DB #00,#06,#06,#06,#7E,#36,#1E,#00
	DB #00,#3C,#66,#06,#7C,#60,#7E,#00
	DB #00,#3C,#66,#66,#7C,#60,#3C,#00
	DB #00,#30,#30,#30,#18,#0C,#3E,#00
	DB #00,#3C,#66,#66,#3C,#66,#3C,#00
	DB #00,#3C,#06,#06,#3E,#66,#3C,#00
	DB #00,#66,#66,#7E,#66,#66,#3E,#00
	DB #00,#7C,#66,#66,#7C,#66,#7C,#00
	DB #00,#3C,#66,#60,#60,#66,#3C,#00
	DB #00,#7C,#66,#66,#66,#66,#7C,#00
	DB #00,#7E,#60,#60,#78,#60,#7E,#00
	DB #00,#60,#60,#60,#78,#60,#7E,#00
	DB #00,#66,#66,#66,#66,#7E,#66,#00
	DB #00,#66,#66,#33,#33,#66,#66,#00
