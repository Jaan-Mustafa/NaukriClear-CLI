//go:build windows

package main

import "os/exec"

func openWithDefaultApp(target string) error {
	return exec.Command("cmd", "/c", "start", target).Run()
}
