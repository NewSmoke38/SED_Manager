# Use a lightweight base image
FROM alpine:latest

# Install the SSH server
RUN apk add --no-cache openssh-server

# Generate the host keys
RUN ssh-keygen -A  # <--- ADD THIS LINE

# Create a directory for the SSH server to run
RUN mkdir -p /var/run/sshd

# Set a simple password for the 'root' user (password is 'toor')
RUN echo 'root:toor' | chpasswd

# Allow root login over SSH
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# Expose the default SSH port
EXPOSE 22

# The command to start the SSH server in the foreground
CMD ["/usr/sbin/sshd", "-D"]