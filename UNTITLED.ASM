; template for programs
.model small
.stack 100h
.data
.code
mov ax,@data
mov ds, ax

; here your program starts



; here you program ends

mov ah,4ch
int 21h
end







